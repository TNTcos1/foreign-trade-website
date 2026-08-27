import {
  AuthorizationError,
  requirePermission,
  type Permission,
} from "@/modules/auth/permissions"
import {
  ADMIN_SESSION_COOKIE,
  AuthenticationError,
  requireSessionToken,
  type AdminSession,
} from "@/modules/auth/session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function requireAdminPageSession(
  permission?: Permission,
): Promise<AdminSession> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  try {
    const session = await requireSessionToken(token)
    if (permission) {
      requirePermission(session.user.role, permission)
    }
    return session
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/admin/login")
    }
    if (error instanceof AuthorizationError) {
      redirect("/admin")
    }
    throw error
  }
}
