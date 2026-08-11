// @vitest-environment node

import { describe, expect, it } from "vitest"

import { createMemoryRateLimiter, hashRateLimitKey } from "@/lib/rate-limit"
import { createWhatsAppUrl } from "@/lib/whatsapp"
import {
  createFormToken,
  createInquiryReceipt,
  verifyFormToken,
  verifyInquiryReceipt,
} from "@/modules/inquiries/security"

const secret = "test-secret-with-enough-entropy-for-signing"
const now = new Date("2026-08-09T12:00:00.000Z")

describe("inquiry security", () => {
  it("accepts a mature form token and rejects early, expired, or tampered tokens", () => {
    const token = createFormToken({ secret, now, nonce: "fixed-nonce" })

    expect(verifyFormToken(token, { secret, now: new Date(now.getTime() + 2_000) })).toBe(true)
    expect(verifyFormToken(token, { secret, now: new Date(now.getTime() + 500) })).toBe(false)
    expect(verifyFormToken(token, { secret, now: new Date(now.getTime() + 86_400_001) })).toBe(false)
    expect(verifyFormToken(`${token}x`, { secret, now: new Date(now.getTime() + 2_000) })).toBe(false)
  })

  it("binds a receipt to the inquiry id and public number", () => {
    const token = createInquiryReceipt({
      secret,
      now,
      inquiryId: "68f28959-5a8f-4563-afb4-baa8fd0174bc",
      inquiryNumber: "INQ-20260809-AB12CD34",
    })

    expect(verifyInquiryReceipt(token, { secret, now: new Date(now.getTime() + 1_000) })).toEqual({
      inquiryId: "68f28959-5a8f-4563-afb4-baa8fd0174bc",
      inquiryNumber: "INQ-20260809-AB12CD34",
    })
    expect(verifyInquiryReceipt(token, { secret: `${secret}-wrong`, now })).toBeNull()
    expect(verifyInquiryReceipt(token, { secret, now: new Date(now.getTime() + 86_400_001) })).toBeNull()
  })

  it("limits attempts without retaining a raw address", () => {
    let clock = now.getTime()
    const limiter = createMemoryRateLimiter({ limit: 2, windowMs: 60_000, now: () => clock })
    const key = hashRateLimitKey("203.0.113.8", secret)

    expect(key).not.toContain("203.0.113.8")
    expect(limiter.check(key)).toMatchObject({ allowed: true, remaining: 1 })
    expect(limiter.check(key)).toMatchObject({ allowed: true, remaining: 0 })
    expect(limiter.check(key)).toMatchObject({ allowed: false, retryAfterSeconds: 60 })

    clock += 60_001
    expect(limiter.check(key)).toMatchObject({ allowed: true, remaining: 1 })
  })

  it("requires explicit safe WhatsApp configuration", () => {
    expect(createWhatsAppUrl("Inquiry INQ-1", {
      baseUrl: "https://wa.me/",
      number: "967700000000",
    })).toBe("https://wa.me/967700000000?text=Inquiry+INQ-1")

    expect(createWhatsAppUrl("Inquiry INQ-1", {
      baseUrl: "javascript:alert(1)",
      number: "967700000000",
    })).toBeNull()
    expect(createWhatsAppUrl("Inquiry INQ-1", {
      baseUrl: "https://user:pass@wa.me/",
      number: "967700000000",
    })).toBeNull()
    expect(createWhatsAppUrl("Inquiry INQ-1", {
      baseUrl: "https://wa.me/",
      number: "+967 700",
    })).toBeNull()
  })
})
