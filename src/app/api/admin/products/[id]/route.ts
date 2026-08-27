import { type NextRequest, NextResponse } from "next/server"

import {
  adminJsonError,
  authorizeAdminRequest,
  readAdminJson,
} from "@/modules/auth/request"
import {
  archiveProduct,
  duplicateProduct,
  markProductSoldOut,
  publishProductLocale,
  restoreProduct,
  saveProductTranslation,
  unpublishProductLocale,
  updateProductDraft,
} from "@/modules/admin/product-service"
import { AdminServiceError } from "@/modules/admin/validation"

function serviceError(error: unknown) {
  if (!(error instanceof AdminServiceError)) {
    return adminJsonError("PRODUCT_MUTATION_UNAVAILABLE", 503)
  }
  const status = error.code.endsWith("_NOT_FOUND")
    ? 404
    : error.code === "PRODUCT_CODE_EXISTS"
      ? 409
      : 400
  return adminJsonError(error.code, status)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeAdminRequest(request, "products:manage")
  if (!authorization.success) {
    return authorization.response
  }
  const parsed = await readAdminJson(request, 64 * 1_024)
  if (!parsed.success) {
    return parsed.response
  }
  const params = await context.params
  const body = parsed.body && typeof parsed.body === "object" && !Array.isArray(parsed.body)
    ? parsed.body as Record<string, unknown>
    : null
  const action = typeof body?.action === "string" ? body.action : ""

  try {
    switch (action) {
      case "update":
        return NextResponse.json({
          ok: true,
          product: await updateProductDraft(
            params.id,
            body?.product,
            authorization.session.user.id,
          ),
        })
      case "save_translation":
        return NextResponse.json({
          ok: true,
          translation: await saveProductTranslation(
            params.id,
            body?.locale,
            body?.translation,
            authorization.session.user.id,
          ),
        })
      case "publish_locale":
        return NextResponse.json({
          ok: true,
          translation: await publishProductLocale(
            params.id,
            body?.locale,
            authorization.session.user.id,
          ),
        })
      case "unpublish_locale":
        await unpublishProductLocale(
          params.id,
          body?.locale,
          authorization.session.user.id,
        )
        return NextResponse.json({ ok: true })
      case "sold_out":
        return NextResponse.json({
          ok: true,
          product: await markProductSoldOut(params.id, authorization.session.user.id),
        })
      case "duplicate":
        return NextResponse.json({
          ok: true,
          product: await duplicateProduct(
            params.id,
            body?.code,
            authorization.session.user.id,
          ),
        }, { status: 201 })
      case "archive":
        return NextResponse.json({
          ok: true,
          product: await archiveProduct(params.id, authorization.session.user.id),
        })
      case "restore":
        return NextResponse.json({
          ok: true,
          product: await restoreProduct(params.id, authorization.session.user.id),
        })
      default:
        return adminJsonError("INVALID_PRODUCT_ACTION", 400)
    }
  } catch (error) {
    return serviceError(error)
  }
}
