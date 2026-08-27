import { type NextRequest, NextResponse } from "next/server"

import { completeAndAttachProductImage } from "@/modules/admin/media-service"
import { AdminServiceError } from "@/modules/admin/validation"
import {
  adminJsonError,
  authorizeAdminRequest,
  readAdminJson,
} from "@/modules/auth/request"
import { MediaServiceError } from "@/modules/media/service"
import {
  createObjectStorage,
  StorageConfigurationError,
} from "@/modules/media/storage"
import {
  type UploadDeclaration,
  validateUploadBatch,
} from "@/modules/media/validation"

type CompletionInput = {
  productId: string
  key: string
  declaration: UploadDeclaration
  altText: string | null
  sortOrder: number
  isPrimary: boolean
}

function parseCompletionInput(value: unknown): CompletionInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const candidate = value as Record<string, unknown>
  const declarationValue = candidate.declaration
  if (
    typeof candidate.productId !== "string" ||
    typeof candidate.key !== "string" ||
    !declarationValue ||
    typeof declarationValue !== "object" ||
    Array.isArray(declarationValue) ||
    (candidate.altText !== null && typeof candidate.altText !== "string") ||
    !Number.isSafeInteger(candidate.sortOrder) ||
    (candidate.sortOrder as number) < 0 ||
    (candidate.sortOrder as number) > 1_000 ||
    typeof candidate.isPrimary !== "boolean"
  ) {
    return null
  }
  const declarationRecord = declarationValue as Record<string, unknown>
  if (
    typeof declarationRecord.fileName !== "string" ||
    typeof declarationRecord.contentType !== "string" ||
    typeof declarationRecord.size !== "number"
  ) {
    return null
  }
  const declaration = {
    fileName: declarationRecord.fileName,
    contentType: declarationRecord.contentType,
    size: declarationRecord.size,
  }
  if (
    !/^staging\/media\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(candidate.key) ||
    (candidate.altText as string | null)?.length &&
      (candidate.altText as string).length > 500 ||
    !validateUploadBatch([declaration]).success
  ) {
    return null
  }
  return {
    productId: candidate.productId,
    key: candidate.key,
    declaration,
    altText: candidate.altText as string | null,
    sortOrder: candidate.sortOrder as number,
    isPrimary: candidate.isPrimary,
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, "media:manage")
  if (!authorization.success) {
    return authorization.response
  }
  const parsed = await readAdminJson(request, 16 * 1_024)
  if (!parsed.success) {
    return parsed.response
  }
  const input = parseCompletionInput(parsed.body)
  if (!input) {
    return adminJsonError("INVALID_MEDIA_COMPLETION", 400)
  }

  try {
    const media = await completeAndAttachProductImage({
      ...input,
      actorId: authorization.session.user.id,
      storage: createObjectStorage(),
    })
    return NextResponse.json({ ok: true, media }, { status: 201 })
  } catch (error) {
    if (error instanceof AdminServiceError) {
      return adminJsonError(
        error.code,
        error.code === "PRODUCT_NOT_FOUND" ? 404 : 400,
      )
    }
    if (error instanceof MediaServiceError) {
      const status = error.code.startsWith("INVALID_") ? 400 : 422
      return adminJsonError(error.code, status)
    }
    if (error instanceof StorageConfigurationError) {
      return adminJsonError("MEDIA_STORAGE_UNAVAILABLE", 503)
    }
    return adminJsonError("MEDIA_COMPLETION_UNAVAILABLE", 503)
  }
}
