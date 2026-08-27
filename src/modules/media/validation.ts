import { fileTypeFromBuffer } from "file-type"
import sharp, { type Metadata } from "sharp"

export const DEFAULT_UPLOAD_LIMITS = {
  maxFiles: 12,
  maxBytesPerFile: 12 * 1_024 * 1_024,
  maxPixels: 40_000_000,
} as const

export type UploadLimits = {
  maxFiles: number
  maxBytesPerFile: number
  maxPixels: number
}

export type UploadDeclaration = {
  fileName: string
  contentType: string
  size: number
}

export type AllowedImageContentType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif"

export type NormalizedUpload = UploadDeclaration & {
  extension: "jpg" | "jpeg" | "png" | "webp" | "avif"
  contentType: AllowedImageContentType
}

export type UploadValidationErrorCode =
  | "NO_FILES"
  | "TOO_MANY_FILES"
  | "INVALID_FILE_NAME"
  | "UNSUPPORTED_FILE_TYPE"
  | "MIME_EXTENSION_MISMATCH"
  | "INVALID_FILE_SIZE"
  | "FILE_TOO_LARGE"
  | "CONTENT_MISMATCH"
  | "INVALID_IMAGE"
  | "IMAGE_TOO_LARGE"

export type UploadValidationResult =
  | { success: true; files: NormalizedUpload[] }
  | {
      success: false
      code: UploadValidationErrorCode
      index?: number
    }

export type VerifiedImage = {
  contentType: AllowedImageContentType
  extension: "jpg" | "png" | "webp" | "avif"
  bytes: number
  width: number
  height: number
}

const extensionsByContentType = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
} as const satisfies Record<AllowedImageContentType, readonly string[]>

const contentTypeByDetectedExtension = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
} as const satisfies Record<VerifiedImage["extension"], AllowedImageContentType>

export class MediaValidationError extends Error {
  constructor(readonly code: UploadValidationErrorCode) {
    super(code)
    this.name = "MediaValidationError"
  }
}

function normalizeLimits(limits: Partial<UploadLimits>): UploadLimits {
  return {
    maxFiles: limits.maxFiles ?? DEFAULT_UPLOAD_LIMITS.maxFiles,
    maxBytesPerFile:
      limits.maxBytesPerFile ?? DEFAULT_UPLOAD_LIMITS.maxBytesPerFile,
    maxPixels: limits.maxPixels ?? DEFAULT_UPLOAD_LIMITS.maxPixels,
  }
}

function isAllowedContentType(value: string): value is AllowedImageContentType {
  return Object.hasOwn(extensionsByContentType, value)
}

function extensionFromFileName(fileName: string): string | null {
  const dotIndex = fileName.lastIndexOf(".")
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return null
  }
  return fileName.slice(dotIndex + 1).toLowerCase()
}

export function validateUploadBatch(
  declarations: UploadDeclaration[],
  limitOverrides: Partial<UploadLimits> = {},
): UploadValidationResult {
  const limits = normalizeLimits(limitOverrides)
  if (declarations.length === 0) {
    return { success: false, code: "NO_FILES" }
  }
  if (declarations.length > limits.maxFiles) {
    return { success: false, code: "TOO_MANY_FILES" }
  }

  const files: NormalizedUpload[] = []
  for (const [index, declaration] of declarations.entries()) {
    const fileName = declaration.fileName.trim()
    if (
      !fileName ||
      fileName.length > 180 ||
      fileName !== declaration.fileName ||
      fileName.includes("/") ||
      fileName.includes("\\") ||
      fileName.includes("\0")
    ) {
      return { success: false, code: "INVALID_FILE_NAME", index }
    }

    const extension = extensionFromFileName(fileName)
    const contentType = declaration.contentType.trim().toLowerCase()
    if (!extension || !isAllowedContentType(contentType)) {
      return { success: false, code: "UNSUPPORTED_FILE_TYPE", index }
    }

    const allowedExtensions = extensionsByContentType[contentType]
    if (!allowedExtensions.some((allowed) => allowed === extension)) {
      const extensionIsKnown = Object.values(extensionsByContentType)
        .flat()
        .some((allowed) => allowed === extension)
      return {
        success: false,
        code: extensionIsKnown
          ? "MIME_EXTENSION_MISMATCH"
          : "UNSUPPORTED_FILE_TYPE",
        index,
      }
    }

    if (!Number.isSafeInteger(declaration.size) || declaration.size <= 0) {
      return { success: false, code: "INVALID_FILE_SIZE", index }
    }
    if (declaration.size > limits.maxBytesPerFile) {
      return { success: false, code: "FILE_TOO_LARGE", index }
    }

    files.push({
      fileName,
      extension: extension as NormalizedUpload["extension"],
      contentType,
      size: declaration.size,
    })
  }

  return { success: true, files }
}

export async function verifyUploadedImage(input: {
  declaration: NormalizedUpload
  body: Uint8Array
  contentLength: number
  contentType: string
  limits?: Partial<UploadLimits>
}): Promise<VerifiedImage> {
  const limits = normalizeLimits(input.limits ?? {})
  if (
    input.contentLength !== input.body.byteLength ||
    input.contentLength !== input.declaration.size ||
    input.contentType.trim().toLowerCase() !== input.declaration.contentType
  ) {
    throw new MediaValidationError("CONTENT_MISMATCH")
  }
  if (input.contentLength > limits.maxBytesPerFile) {
    throw new MediaValidationError("FILE_TOO_LARGE")
  }

  const detected = await fileTypeFromBuffer(input.body)
  if (
    !detected ||
    !Object.hasOwn(contentTypeByDetectedExtension, detected.ext)
  ) {
    throw new MediaValidationError("INVALID_IMAGE")
  }

  const extension = detected.ext as VerifiedImage["extension"]
  const detectedContentType = contentTypeByDetectedExtension[extension]
  if (detectedContentType !== input.declaration.contentType) {
    throw new MediaValidationError("CONTENT_MISMATCH")
  }

  let metadata: Metadata
  try {
    metadata = await sharp(input.body, { failOn: "error" }).metadata()
  } catch {
    throw new MediaValidationError("INVALID_IMAGE")
  }

  const width = metadata.width
  const height = metadata.height
  if (!width || !height) {
    throw new MediaValidationError("INVALID_IMAGE")
  }
  if (width * height > limits.maxPixels) {
    throw new MediaValidationError("IMAGE_TOO_LARGE")
  }

  return {
    contentType: detectedContentType,
    extension,
    bytes: input.contentLength,
    width,
    height,
  }
}
