// @vitest-environment node

import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { POST } from "@/app/api/inquiries/route"

const origin = "http://localhost:3000"

function request(body: string, contentType: string, contentLength?: string): NextRequest {
  const headers = new Headers({
    origin,
    "content-type": contentType,
  })
  if (contentLength !== undefined) {
    headers.set("content-length", contentLength)
  }
  return new NextRequest(`${origin}/api/inquiries`, {
    method: "POST",
    headers,
    body,
  })
}

describe("inquiry API request boundary", () => {
  it("rejects non-JSON media types before reading the body", async () => {
    const response = await POST(request("x".repeat(40_000), "application/jsonp"))

    expect(response.status).toBe(415)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "UNSUPPORTED_MEDIA_TYPE",
    })
  })

  it("enforces the body limit even when Content-Length is understated", async () => {
    const originalSecret = process.env.AUTH_SECRET
    process.env.AUTH_SECRET = "test-secret-with-enough-entropy-for-signing"
    try {
      const response = await POST(request(
        "x".repeat(33 * 1_024),
        "application/json",
        "1",
      ))

      expect(response.status).toBe(413)
      await expect(response.json()).resolves.toMatchObject({
        ok: false,
        code: "REQUEST_TOO_LARGE",
      })
    } finally {
      if (originalSecret === undefined) {
        delete process.env.AUTH_SECRET
      } else {
        process.env.AUTH_SECRET = originalSecret
      }
    }
  })
})
