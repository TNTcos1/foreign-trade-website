import { describe, expect, it } from "vitest"

describe("project bootstrap", () => {
  it("exposes the public app contract", async () => {
    const response = await fetch("http://localhost:3000/en")
    expect(response.status).toBe(200)
    expect(await response.text()).toContain("Stock")
  })
})
