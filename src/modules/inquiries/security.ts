import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const FORM_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1_000
const FORM_TOKEN_MIN_AGE_MS = 2_000
const RECEIPT_MAX_AGE_MS = 24 * 60 * 60 * 1_000

export const INQUIRY_RECEIPT_COOKIE = "harbor-stock-inquiry-receipt"

type ClockOptions = {
  secret: string
  now?: Date
}

type TokenPayload = {
  v: 1
  purpose: "form" | "receipt"
  issuedAt: number
  nonce?: string
  inquiryId?: string
  inquiryNumber?: string
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url")
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function pack(payload: TokenPayload, secret: string): string {
  const encoded = encode(JSON.stringify(payload))
  return `${encoded}.${sign(encoded, secret)}`
}

function unpack(token: string, secret: string): TokenPayload | null {
  const [encoded, signature, extra] = token.split(".")
  if (!encoded || !signature || extra) {
    return null
  }
  const expected = Buffer.from(sign(encoded, secret))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null
    }
    const candidate = payload as Partial<TokenPayload>
    if (candidate.v !== 1 || typeof candidate.issuedAt !== "number") {
      return null
    }
    return candidate as TokenPayload
  } catch {
    return null
  }
}

export function createFormToken({
  secret,
  now = new Date(),
  nonce = randomBytes(18).toString("base64url"),
}: ClockOptions & { nonce?: string }): string {
  return pack({
    v: 1,
    purpose: "form",
    issuedAt: now.getTime(),
    nonce,
  }, secret)
}

export function verifyFormToken(
  token: string,
  { secret, now = new Date() }: ClockOptions,
): boolean {
  const payload = unpack(token, secret)
  if (!payload || payload.purpose !== "form" || typeof payload.nonce !== "string") {
    return false
  }
  const age = now.getTime() - payload.issuedAt
  return age >= FORM_TOKEN_MIN_AGE_MS && age <= FORM_TOKEN_MAX_AGE_MS
}

export function createInquiryReceipt({
  secret,
  now = new Date(),
  inquiryId,
  inquiryNumber,
}: ClockOptions & { inquiryId: string; inquiryNumber: string }): string {
  return pack({
    v: 1,
    purpose: "receipt",
    issuedAt: now.getTime(),
    inquiryId,
    inquiryNumber,
  }, secret)
}

export function verifyInquiryReceipt(
  token: string,
  { secret, now = new Date() }: ClockOptions,
): { inquiryId: string; inquiryNumber: string } | null {
  const payload = unpack(token, secret)
  if (
    !payload ||
    payload.purpose !== "receipt" ||
    typeof payload.inquiryId !== "string" ||
    typeof payload.inquiryNumber !== "string"
  ) {
    return null
  }
  const age = now.getTime() - payload.issuedAt
  if (age < 0 || age > RECEIPT_MAX_AGE_MS) {
    return null
  }
  return {
    inquiryId: payload.inquiryId,
    inquiryNumber: payload.inquiryNumber,
  }
}

export function getInquirySecret(): string {
  const secret = process.env.AUTH_SECRET?.trim()
  if (!secret) {
    throw new Error("AUTH_SECRET is required for inquiry security")
  }
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters")
  }
  return secret
}
