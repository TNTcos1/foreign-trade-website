import { type NextRequest, NextResponse } from "next/server"

import { listAdminUsers } from "@/modules/admin/user-service"
import {
  adminJsonError,
  authorizeAdminRequest,
} from "@/modules/auth/request"

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, "users:manage")
  if (!authorization.success) {
    return authorization.response
  }

  try {
    return NextResponse.json({ ok: true, users: await listAdminUsers() })
  } catch {
    return adminJsonError("USER_LIST_UNAVAILABLE", 503)
  }
}
