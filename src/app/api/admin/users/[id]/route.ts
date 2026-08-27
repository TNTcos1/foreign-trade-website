import { type NextRequest, NextResponse } from "next/server"

import {
  changeAdminUserRole,
  resetAdminUserPassword,
  setAdminUserActive,
} from "@/modules/admin/user-service"
import { AdminServiceError } from "@/modules/admin/validation"
import {
  adminJsonError,
  authorizeAdminRequest,
  readAdminJson,
} from "@/modules/auth/request"

const serviceErrorStatuses: Record<string, 400 | 404 | 409> = {
  INVALID_ENTITY_ID: 400,
  INVALID_USER_ROLE: 400,
  INVALID_ACTIVE_STATE: 400,
  INVALID_PASSWORD: 400,
  ADMIN_USER_NOT_FOUND: 404,
  ACTOR_NOT_FOUND: 404,
  ACTOR_NOT_AUTHORIZED: 409,
  SELF_DEACTIVATION_FORBIDDEN: 409,
  SELF_DEMOTION_FORBIDDEN: 409,
  LAST_ACTIVE_ADMIN: 409,
}

function serviceError(error: unknown) {
  if (error instanceof AdminServiceError) {
    if (Object.hasOwn(serviceErrorStatuses, error.code)) {
      return adminJsonError(error.code, serviceErrorStatuses[error.code])
    }
  }
  return adminJsonError("USER_MUTATION_UNAVAILABLE", 503)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeAdminRequest(request, "users:manage")
  if (!authorization.success) {
    return authorization.response
  }

  const parsed = await readAdminJson(request, 64 * 1_024)
  if (!parsed.success) {
    return parsed.response
  }

  const body = parsed.body && typeof parsed.body === "object" && !Array.isArray(parsed.body)
    ? parsed.body as Record<string, unknown>
    : null
  const action = typeof body?.action === "string" ? body.action : ""
  const params = await context.params
  const actorId = authorization.session.user.id
  const targetUserId = params.id

  try {
    switch (action) {
      case "change_role":
        return NextResponse.json({
          ok: true,
          user: await changeAdminUserRole({
            actorId,
            targetUserId,
            role: body?.role,
          }),
        })
      case "set_active":
        return NextResponse.json({
          ok: true,
          user: await setAdminUserActive({
            actorId,
            targetUserId,
            active: body?.active,
          }),
        })
      case "reset_password":
        await resetAdminUserPassword({
          actorId,
          targetUserId,
          password: body?.password,
        })
        return NextResponse.json({ ok: true })
      default:
        return adminJsonError("INVALID_USER_ACTION", 400)
    }
  } catch (error) {
    return serviceError(error)
  }
}
