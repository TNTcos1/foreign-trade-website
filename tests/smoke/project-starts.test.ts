import { describe, expect, it } from "vitest"

describe("project bootstrap", () => {
  it("exposes the public app contract", async () => {
    const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000"
    const response = await fetch(`${baseUrl}/en`)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain("Stock")
  })
})
