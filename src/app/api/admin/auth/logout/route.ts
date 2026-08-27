import { NextResponse, type NextRequest } from "next/server"

import { adminJsonError, isSameOrigin } from "@/modules/auth/request"
import {
  ADMIN_SESSION_COOKIE,
  getSessionToken,
  revokeAdminSession,
} from "@/modules/auth/session"

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return adminJsonError("INVALID_ORIGIN", 403)
  }
  const token = getSessionToken(request)
  if (token) {
    await revokeAdminSession(token)
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return response
}
