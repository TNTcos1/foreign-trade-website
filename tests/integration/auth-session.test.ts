// @vitest-environment node

import { createHash } from "node:crypto"

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { prisma } from "@/lib/prisma"
import {
  createAdminSession,
  readAdminSession,
  revokeAdminSession,
} from "@/modules/auth/session"

const email = `session-${Date.now()}@example.test`
let adminUserId: string

beforeAll(async () => {
  const user = await prisma.adminUser.create({
    data: {
      email,
      name: "Session Test Admin",
      passwordHash: "not-used-by-session-tests",
      role: "ADMIN",
    },
  })
  adminUserId = user.id
})

afterEach(async () => {
  await prisma.adminSession.deleteMany({ where: { adminUserId } })
  await prisma.adminUser.update({
    where: { id: adminUserId },
    data: { active: true, authVersion: 0 },
  })
})

afterAll(async () => {
  await prisma.adminUser.delete({ where: { id: adminUserId } })
  await prisma.$disconnect()
})

describe("database-backed admin sessions", () => {
  it("returns an opaque token and stores only its SHA-256 hash", async () => {
    const created = await createAdminSession({ adminUserId })
    const stored = await prisma.adminSession.findUniqueOrThrow({
      where: { id: created.sessionId },
    })

    expect(created.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(stored.tokenHash).toBe(createHash("sha256").update(created.token).digest("hex"))
    expect(stored.tokenHash).not.toBe(created.token)
    expect(stored.expiresAt).toEqual(created.expiresAt)
  })

  it("returns the active user for a valid token", async () => {
    const created = await createAdminSession({ adminUserId })

    await expect(readAdminSession(created.token)).resolves.toMatchObject({
      sessionId: created.sessionId,
      user: {
        id: adminUserId,
        email,
        role: "ADMIN",
      },
    })
  })

  it("rejects a session created from stale user state after deactivation", async () => {
    const staleUser = await prisma.adminUser.findUniqueOrThrow({
      where: { id: adminUserId },
      select: { id: true, authVersion: true },
    })
    await prisma.adminUser.update({ where: { id: adminUserId }, data: { active: false } })

    await expect(createAdminSession({
      adminUserId: staleUser.id,
      authVersion: staleUser.authVersion,
    })).rejects.toThrow("UNAUTHORIZED")
  })

  it("rejects expired, revoked, malformed, inactive-user, and stale-version sessions", async () => {
    const expired = await createAdminSession({
      adminUserId,
      now: new Date("2026-01-02T00:00:00.000Z"),
      expiresAt: new Date("2026-01-02T01:00:00.000Z"),
    })
    await expect(readAdminSession(expired.token, new Date("2026-01-02T01:00:00.001Z"))).resolves.toBeNull()

    const revoked = await createAdminSession({ adminUserId })
    await revokeAdminSession(revoked.token)
    await expect(readAdminSession(revoked.token)).resolves.toBeNull()

    await expect(readAdminSession("not-a-valid-token")).resolves.toBeNull()

    const staleVersion = await createAdminSession({ adminUserId })
    await prisma.adminUser.update({
      where: { id: adminUserId },
      data: { authVersion: { increment: 1 } },
    })
    await expect(readAdminSession(staleVersion.token)).resolves.toBeNull()

    const inactive = await createAdminSession({ adminUserId })
    await prisma.adminUser.update({ where: { id: adminUserId }, data: { active: false } })
    await expect(readAdminSession(inactive.token)).resolves.toBeNull()
  })
})
