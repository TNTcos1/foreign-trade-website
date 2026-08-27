import { NextResponse, type NextRequest } from "next/server"

import { hashRateLimitKey, inquiryRateLimiter } from "@/lib/rate-limit"
import {
  INQUIRY_RECEIPT_COOKIE,
  createInquiryReceipt,
  getInquirySecret,
  verifyFormToken,
} from "@/modules/inquiries/security"
import {
  InquiryProductsUnavailableError,
  submitInquiry,
} from "@/modules/inquiries/service"
import { validateInquiryForm } from "@/modules/inquiries/validation"

const MAX_REQUEST_BYTES = 32 * 1_024

async function readLimitedBody(request: NextRequest): Promise<string | null> {
  if (!request.body) {
    return ""
  }

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let byteLength = 0
  let body = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        return body + decoder.decode()
      }
      byteLength += value.byteLength
      if (byteLength > MAX_REQUEST_BYTES) {
        await reader.cancel()
        return null
      }
      body += decoder.decode(value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }
}

function jsonError(
  code: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({ ok: false, code, ...extra }, { status })
}

function isSameOrigin(request: NextRequest): boolean {
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

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError("INVALID_ORIGIN", 403)
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase()
  if (contentType !== "application/json") {
    return jsonError("UNSUPPORTED_MEDIA_TYPE", 415)
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return jsonError("REQUEST_TOO_LARGE", 413)
  }

  const secret = getInquirySecret()
  const forwardedAddress = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
  const address = forwardedAddress || request.headers.get("x-real-ip")?.trim() || "unknown"
  const rateLimit = inquiryRateLimiter.check(hashRateLimitKey(address, secret))
  if (!rateLimit.allowed) {
    const response = jsonError("RATE_LIMITED", 429, {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    })
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds))
    return response
  }

  let body: unknown
  try {
    const rawBody = await readLimitedBody(request)
    if (rawBody === null) {
      return jsonError("REQUEST_TOO_LARGE", 413)
    }
    body = JSON.parse(rawBody) as unknown
  } catch {
    return jsonError("INVALID_JSON", 400)
  }

  const validation = validateInquiryForm(body)
  if (!validation.success) {
    return jsonError("VALIDATION_ERROR", 400, {
      fieldErrors: validation.fieldErrors,
      itemErrors: validation.itemErrors,
    })
  }

  if (!verifyFormToken(validation.data.antiBotToken, { secret })) {
    return jsonError("BOT_REJECTED", 400)
  }

  try {
    const result = await submitInquiry(validation.data)
    const response = NextResponse.json({
      ok: true,
      inquiryNumber: result.inquiryNumber,
      redirectUrl: `/${validation.data.locale}/inquiry/success/${encodeURIComponent(result.inquiryNumber)}`,
      duplicate: result.duplicate,
    }, { status: result.duplicate ? 200 : 201 })
    response.cookies.set({
      name: INQUIRY_RECEIPT_COOKIE,
      value: createInquiryReceipt({
        secret,
        inquiryId: result.inquiryId,
        inquiryNumber: result.inquiryNumber,
      }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 24 * 60 * 60,
    })
    return response
  } catch (error) {
    if (error instanceof InquiryProductsUnavailableError) {
      return jsonError("PRODUCT_UNAVAILABLE", 409, {
        itemErrors: error.productIds.map((productId) => ({
          productId,
          code: "UNAVAILABLE",
        })),
      })
    }
    return jsonError("SERVER_ERROR", 500)
  }
}
