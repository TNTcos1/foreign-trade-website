import { type NextRequest, NextResponse } from "next/server"

import {
  saveContentTranslation,
  publishContentLocale,
  unpublishContentLocale,
} from "@/modules/admin/content-service"
import { AdminServiceError } from "@/modules/admin/validation"
import {
  adminJsonError,
  authorizeAdminRequest,
  readAdminJson,
} from "@/modules/auth/request"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  const authorization = await authorizeAdminRequest(request, "content:manage")
  if (!authorization.success) {
    return authorization.response
  }
  const parsed = await readAdminJson(request, 64 * 1_024)
  if (!parsed.success) {
    return parsed.response
  }
  const params = await context.params
  const slug = params.slug.join("/")
  const body = parsed.body && typeof parsed.body === "object" && !Array.isArray(parsed.body)
    ? parsed.body as Record<string, unknown>
    : null
  const action = typeof body?.action === "string" ? body.action : ""

  try {
    switch (action) {
      case "save_translation":
        return NextResponse.json({
          ok: true,
          translation: await saveContentTranslation(
            slug,
            body?.locale,
            body?.translation,
            authorization.session.user.id,
          ),
        })
      case "publish_locale":
        return NextResponse.json({
          ok: true,
          translation: await publishContentLocale(
            slug,
            body?.locale,
            authorization.session.user.id,
          ),
        })
      case "unpublish_locale":
        await unpublishContentLocale(
          slug,
          body?.locale,
          authorization.session.user.id,
        )
        return NextResponse.json({ ok: true })
      default:
        return adminJsonError("INVALID_CONTENT_ACTION", 400)
    }
  } catch (error) {
    if (error instanceof AdminServiceError) {
      const status = error.code.endsWith("_NOT_FOUND") ? 404 : 400
      return adminJsonError(error.code, status)
    }
    return adminJsonError("CONTENT_MUTATION_UNAVAILABLE", 503)
  }
}
