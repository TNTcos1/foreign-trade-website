import { type NextRequest, NextResponse } from "next/server"

import {
  adminJsonError,
  authorizeAdminRequest,
  readAdminJson,
} from "@/modules/auth/request"
import { createPresignedUpload, MediaServiceError } from "@/modules/media/service"
import {
  createObjectStorage,
  StorageConfigurationError,
} from "@/modules/media/storage"
import {
  type UploadDeclaration,
  validateUploadBatch,
} from "@/modules/media/validation"

function parseDeclaration(value: unknown): UploadDeclaration | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.fileName !== "string" ||
    typeof candidate.contentType !== "string" ||
    typeof candidate.size !== "number"
  ) {
    return null
  }
  return {
    fileName: candidate.fileName,
    contentType: candidate.contentType,
    size: candidate.size,
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, "media:manage")
  if (!authorization.success) {
    return authorization.response
  }

  const parsed = await readAdminJson(request)
  if (!parsed.success) {
    return parsed.response
  }
  const declaration = parseDeclaration(parsed.body)
  if (!declaration || !validateUploadBatch([declaration]).success) {
    return adminJsonError("INVALID_DECLARATION", 400)
  }

  try {
    const upload = await createPresignedUpload({
      declaration,
      storage: createObjectStorage(),
    })
    return NextResponse.json({ ok: true, upload })
  } catch (error) {
    if (error instanceof MediaServiceError && error.code === "INVALID_DECLARATION") {
      return adminJsonError("INVALID_DECLARATION", 400)
    }
    if (error instanceof StorageConfigurationError) {
      return adminJsonError("MEDIA_STORAGE_UNAVAILABLE", 503)
    }
    return adminJsonError("MEDIA_UPLOAD_UNAVAILABLE", 503)
  }
}
