import { NextResponse, type NextRequest } from "next/server"

import { adminLoginRateLimiter } from "@/lib/rate-limit"
import { loginAdmin, validateAdminLogin } from "@/modules/auth/login"
import {
  adminJsonError,
  getAuthSecret,
  getClientAddress,
  hashAdminRateLimitKey,
  readAdminJson,
} from "@/modules/auth/request"
import { ADMIN_SESSION_COOKIE } from "@/modules/auth/session"

export async function POST(request: NextRequest) {
  const parsed = await readAdminJson(request)
  if (!parsed.success) {
    return parsed.response
  }
  const credentials = validateAdminLogin(parsed.body)
  if (!credentials.success) {
    return adminJsonError("INVALID_CREDENTIALS", 401)
  }

  const secret = getAuthSecret()
  const address = getClientAddress(request)
  const key = hashAdminRateLimitKey(`${address}\0${credentials.email}`, secret)
  const rateLimit = adminLoginRateLimiter.check(key)
  if (!rateLimit.allowed) {
    const response = adminJsonError("RATE_LIMITED", 429, {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    })
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds))
    return response
  }

  const result = await loginAdmin(credentials.email, credentials.password)
  if (!result) {
    return adminJsonError("INVALID_CREDENTIALS", 401)
  }

  const response = NextResponse.json({
    ok: true,
    user: result.user,
    redirectUrl: "/admin",
  })
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: result.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: result.expiresAt,
  })
  return response
}
