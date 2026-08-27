import { createHmac } from "node:crypto"

import { NextResponse, type NextRequest } from "next/server"

import {
  AuthorizationError,
  requirePermission,
  type Permission,
} from "@/modules/auth/permissions"
import {
  AuthenticationError,
  requireSession,
  type AdminSession,
} from "@/modules/auth/session"

const DEFAULT_MAX_REQUEST_BYTES = 8 * 1_024

export type AdminJsonResult =
  | { success: true; body: unknown }
  | { success: false; response: NextResponse }

export type AdminAuthorizationResult =
  | { success: true; session: AdminSession }
  | { success: false; response: NextResponse }

export function adminJsonError(
  code: string,
  status: number,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ ok: false, code, ...extra }, { status })
}

export async function authorizeAdminRequest(
  request: NextRequest,
  permission: Permission,
): Promise<AdminAuthorizationResult> {
  try {
    const session = await requireSession(request)
    requirePermission(session.user.role, permission)
    return { success: true, session }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { success: false, response: adminJsonError("UNAUTHORIZED", 401) }
    }
    if (error instanceof AuthorizationError) {
      return { success: false, response: adminJsonError("FORBIDDEN", 403) }
    }
    throw error
  }
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  if (!origin) {
    return false
  }
  try {
    return new URL(origin).origin === request.nextUrl.origin
  } catch {
    return false
  }
}

export function getClientAddress(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
}

export function getAuthSecret(environment: NodeJS.ProcessEnv = process.env): string {
  const secret = environment.AUTH_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters")
  }
  return secret
}

export function hashAdminRateLimitKey(value: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`admin-login-rate-limit:v1:${value}`)
    .digest("hex")
}

export async function readAdminJson(
  request: NextRequest,
  maxBytes = DEFAULT_MAX_REQUEST_BYTES,
): Promise<AdminJsonResult> {
  if (!isSameOrigin(request)) {
    return { success: false, response: adminJsonError("INVALID_ORIGIN", 403) }
  }
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase()
  if (contentType !== "application/json") {
    return { success: false, response: adminJsonError("UNSUPPORTED_MEDIA_TYPE", 415) }
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { success: false, response: adminJsonError("REQUEST_TOO_LARGE", 413) }
  }

  if (!request.body) {
    return { success: false, response: adminJsonError("INVALID_JSON", 400) }
  }
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let byteLength = 0
  let rawBody = ""
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        rawBody += decoder.decode()
        break
      }
      byteLength += value.byteLength
      if (byteLength > maxBytes) {
        await reader.cancel()
        return { success: false, response: adminJsonError("REQUEST_TOO_LARGE", 413) }
      }
      rawBody += decoder.decode(value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }

  try {
    return { success: true, body: JSON.parse(rawBody) as unknown }
  } catch {
    return { success: false, response: adminJsonError("INVALID_JSON", 400) }
  }
}
