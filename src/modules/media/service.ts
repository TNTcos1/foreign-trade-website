import { createHash, randomUUID } from "node:crypto"

import { generateImageVariants } from "@/modules/media/image-variants"
import type { ObjectStorage } from "@/modules/media/storage"
import {
  DEFAULT_UPLOAD_LIMITS,
  MediaValidationError,
  type NormalizedUpload,
  type UploadDeclaration,
  type UploadLimits,
  validateUploadBatch,
  verifyUploadedImage,
} from "@/modules/media/validation"

const PRESIGNED_UPLOAD_TTL_SECONDS = 5 * 60
const stagingKeyPattern = /^staging\/media\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/

type MediaVariant = {
  key: string
  contentType: "image/webp"
  bytes: number
  width: number
  height: number
}

export type MediaMetadataV1 = {
  version: 1
  original: {
    key: string
    contentType: string
    bytes: number
    checksumSha256: string
    width: number
    height: number
  }
  variants: Record<
    "primary" | "card" | "thumbnail" | "social-share",
    MediaVariant
  >
}

export type PublishedMediaMetadataV1 = Omit<MediaMetadataV1, "variants"> & {
  variants: Record<keyof MediaMetadataV1["variants"], MediaVariant & { url: string }>
}

export class MediaServiceError extends Error {
  constructor(
    readonly code:
      | "INVALID_DECLARATION"
      | "INVALID_STAGING_KEY"
      | "CONTENT_MISMATCH"
      | "PROCESSING_FAILED",
  ) {
    super(code)
    this.name = "MediaServiceError"
  }
}

function validateSingleDeclaration(
  declaration: UploadDeclaration,
  limits?: Partial<UploadLimits>,
): NormalizedUpload {
  const result = validateUploadBatch([declaration], limits)
  if (!result.success) {
    throw new MediaServiceError("INVALID_DECLARATION")
  }
  return result.files[0]
}

function stagingIdentifier(key: string): string {
  const match = stagingKeyPattern.exec(key)
  if (!match) {
    throw new MediaServiceError("INVALID_STAGING_KEY")
  }
  return match[1]
}

export async function createPresignedUpload(input: {
  declaration: UploadDeclaration
  storage: ObjectStorage
  limits?: Partial<UploadLimits>
}) {
  const normalized = validateSingleDeclaration(input.declaration, input.limits)
  const key = `staging/media/${randomUUID()}`
  const presigned = await input.storage.createPresignedPost({
    key,
    contentType: normalized.contentType,
    maxBytes: normalized.size,
    expiresInSeconds: PRESIGNED_UPLOAD_TTL_SECONDS,
  })
  return {
    key,
    uploadUrl: presigned.uploadUrl,
    fields: presigned.fields,
    expiresAt: presigned.expiresAt.toISOString(),
  }
}

export async function completeUploadedImage(input: {
  key: string
  declaration: UploadDeclaration
  storage: ObjectStorage
  limits?: Partial<UploadLimits>
}): Promise<{ metadata: MediaMetadataV1 }> {
  const normalized = validateSingleDeclaration(input.declaration, input.limits)
  const identifier = stagingIdentifier(input.key)
  const createdVariantKeys: string[] = []

  try {
    const object = await input.storage.getObject(
      input.key,
      input.limits?.maxBytesPerFile ?? DEFAULT_UPLOAD_LIMITS.maxBytesPerFile,
    )
    const verified = await verifyUploadedImage({
      declaration: normalized,
      body: object.body,
      contentLength: object.contentLength,
      contentType: object.contentType,
      limits: input.limits,
    })
    const generated = await generateImageVariants(object.body)
    const variants = {} as MediaMetadataV1["variants"]

    for (const variant of generated) {
      const key = `staging/media/${identifier}/${variant.name}.${variant.extension}`
      createdVariantKeys.push(key)
      await input.storage.putObject({
        key,
        body: variant.body,
        contentLength: variant.bytes,
        contentType: variant.contentType,
      })
      variants[variant.name] = {
        key,
        contentType: variant.contentType,
        bytes: variant.bytes,
        width: variant.width,
        height: variant.height,
      }
    }

    return {
      metadata: {
        version: 1,
        original: {
          key: input.key,
          contentType: verified.contentType,
          bytes: verified.bytes,
          checksumSha256: createHash("sha256")
            .update(object.body)
            .digest("hex"),
          width: verified.width,
          height: verified.height,
        },
        variants,
      },
    }
  } catch (error) {
    await Promise.allSettled([
      ...createdVariantKeys.map((key) => input.storage.deleteObject(key)),
      input.storage.deleteObject(input.key),
    ])
    if (error instanceof MediaValidationError) {
      throw new MediaServiceError(
        error.code === "CONTENT_MISMATCH"
          ? "CONTENT_MISMATCH"
          : "PROCESSING_FAILED",
      )
    }
    if (error instanceof MediaServiceError) {
      throw error
    }
    throw new MediaServiceError("PROCESSING_FAILED")
  }
}

export async function publishCompletedImage(input: {
  metadata: MediaMetadataV1
  storage: ObjectStorage
}): Promise<{
  primaryUrl: string
  metadata: PublishedMediaMetadataV1
  cleanup: () => Promise<void>
}> {
  const identifier = stagingIdentifier(input.metadata.original.key)
  const publishedKeys: string[] = []
  const variants = {} as PublishedMediaMetadataV1["variants"]

  try {
    for (const [name, variant] of Object.entries(input.metadata.variants)) {
      if (!variant.key.startsWith(`staging/media/${identifier}/`)) {
        throw new MediaServiceError("INVALID_STAGING_KEY")
      }
      const object = await input.storage.getObject(variant.key, variant.bytes)
      if (
        object.contentLength !== variant.bytes ||
        object.contentType !== variant.contentType
      ) {
        throw new MediaServiceError("CONTENT_MISMATCH")
      }
      const publicKey = `public/media/${identifier}/${name}.webp`
      publishedKeys.push(publicKey)
      await input.storage.putObject({ key: publicKey, ...object })
      variants[name as keyof MediaMetadataV1["variants"]] = {
        ...variant,
        key: publicKey,
        url: input.storage.getPublicUrl(publicKey),
      }
    }
  } catch (error) {
    await Promise.allSettled(
      publishedKeys.map((key) => input.storage.deleteObject(key)),
    )
    if (error instanceof MediaServiceError) {
      throw error
    }
    throw new MediaServiceError("PROCESSING_FAILED")
  }

  if (!variants.primary) {
    await Promise.allSettled(
      publishedKeys.map((key) => input.storage.deleteObject(key)),
    )
    throw new MediaServiceError("PROCESSING_FAILED")
  }
  const cleanup = async () => {
    await Promise.allSettled(
      publishedKeys.map((key) => input.storage.deleteObject(key)),
    )
  }
  return {
    primaryUrl: variants.primary.url,
    metadata: { ...input.metadata, variants },
    cleanup,
  }
}

export const mediaUploadDefaults = {
  maxBytesPerFile: DEFAULT_UPLOAD_LIMITS.maxBytesPerFile,
  expiresInSeconds: PRESIGNED_UPLOAD_TTL_SECONDS,
} as const
