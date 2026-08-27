import { type NextRequest, NextResponse } from "next/server"

import {
  adminJsonError,
  authorizeAdminRequest,
  readAdminJson,
} from "@/modules/auth/request"
import { createProductDraft } from "@/modules/admin/product-service"
import { AdminServiceError } from "@/modules/admin/validation"

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, "products:manage")
  if (!authorization.success) {
    return authorization.response
  }

  const parsed = await readAdminJson(request, 64 * 1_024)
  if (!parsed.success) {
    return parsed.response
  }

  try {
    const product = await createProductDraft(parsed.body, authorization.session.user.id)
    return NextResponse.json({ ok: true, product }, { status: 201 })
  } catch (error) {
    if (error instanceof AdminServiceError) {
      const status = error.code === "PRODUCT_CODE_EXISTS" ? 409 : 400
      return adminJsonError(error.code, status)
    }
    return adminJsonError("PRODUCT_SAVE_UNAVAILABLE", 503)
  }
}
