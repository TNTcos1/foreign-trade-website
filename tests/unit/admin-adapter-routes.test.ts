// @vitest-environment node

import { describe, expect, it } from "vitest"

import { POST as presign } from "@/app/api/admin/media/presign/route"
import { POST as translate } from "@/app/api/admin/translation/route"

describe("Task 7 admin adapter routes", () => {
  it.each([
    ["media", presign],
    ["translation", translate],
  ])("keeps the %s adapter unavailable until admin auth exists", async (_, handler) => {
    const response = await handler()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "ADMIN_AUTH_UNAVAILABLE",
    })
  })
})
