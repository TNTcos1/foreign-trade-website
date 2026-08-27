// @vitest-environment node

import { hash as bcryptHash } from "bcryptjs"
import { describe, expect, it } from "vitest"

import { hashPassword, verifyPassword } from "@/modules/auth/password"

describe("admin password security", () => {
  it("hashes passwords with bcrypt cost 12", async () => {
    const hash = await hashPassword("correct horse battery staple")

    expect(hash).toMatch(/^\$2[aby]\$12\$/)
    expect(hash).not.toContain("correct horse battery staple")
  })

  it("accepts only the matching password", async () => {
    const hash = await hashPassword("a strong development password")

    await expect(verifyPassword("a strong development password", hash)).resolves.toBe(true)
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false)
  })

  it("distinguishes passwords that differ after bcrypt's 72-byte boundary", async () => {
    const first = `a${"你".repeat(24)}A1!`
    const second = `a${"你".repeat(24)}B1!`
    const hash = await hashPassword(first)

    await expect(verifyPassword(first, hash)).resolves.toBe(true)
    await expect(verifyPassword(second, hash)).resolves.toBe(false)
  })

  it("distinguishes multibyte passwords that share the first 72 UTF-8 bytes", async () => {
    const first = `${"你".repeat(24)}A1!`
    const second = `${"你".repeat(24)}B1!`
    const hash = await hashPassword(first)

    await expect(verifyPassword(first, hash)).resolves.toBe(true)
    await expect(verifyPassword(second, hash)).resolves.toBe(false)
  })

  it("does not verify legacy direct bcrypt hashes for passwords beyond bcrypt's 72-byte limit", async () => {
    const password = `${"a".repeat(72)}A1!`
    const legacyHash = await bcryptHash(password, 12)

    await expect(verifyPassword(password, legacyHash)).resolves.toBe(false)
  })
})
