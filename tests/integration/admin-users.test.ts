// @vitest-environment node

import { createHash, randomUUID } from "node:crypto"

import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/prisma"
import {
  changeAdminUserRole,
  listAdminUsers,
  resetAdminUserPassword,
  setAdminUserActive,
} from "@/modules/admin/user-service"
import { AdminServiceError } from "@/modules/admin/validation"
import { hashPassword, verifyPassword } from "@/modules/auth/password"
import { createAdminSession, readAdminSession } from "@/modules/auth/session"

const testPrefix = `admin-users-${Date.now()}`

let fixtureSequence = 0
let sessionSequence = 0
let fixtureIds: string[] = []
let actorId = ""
let backupAdminId = ""
let editorId = ""
let salesId = ""

async function createFixtureUser({
  label,
  name,
  role,
  active = true,
}: {
  label: string
  name: string
  role: "ADMIN" | "EDITOR" | "SALES"
  active?: boolean
}): Promise<string> {
  const user = await prisma.adminUser.create({
    data: {
      email: `${testPrefix}-${fixtureSequence}-${label}@example.test`,
      name,
      passwordHash: `fixture-hash-${label}`,
      role,
      active,
      developmentOnly: label === "sales",
    },
    select: { id: true },
  })
  fixtureIds.push(user.id)
  return user.id
}

async function createStoredSession(adminUserId: string, revokedAt: Date | null = null) {
  sessionSequence += 1
  const user = await prisma.adminUser.findUniqueOrThrow({
    where: { id: adminUserId },
    select: { authVersion: true },
  })
  return prisma.adminSession.create({
    data: {
      tokenHash: `${testPrefix}-session-${sessionSequence}`,
      adminUserId,
      authVersion: user.authVersion,
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      revokedAt,
    },
  })
}

async function expectAdminError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise
    throw new Error(`Expected AdminServiceError with code ${code}`)
  } catch (error) {
    expect(error).toBeInstanceOf(AdminServiceError)
    expect((error as AdminServiceError).code).toBe(code)
  }
}

async function waitForBlockedAdminUserUpdateOrSettlement(
  hasSettled: () => boolean,
): Promise<"blocked" | "settled"> {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if (hasSettled()) {
      return "settled"
    }
    const [result] = await prisma.$queryRaw<Array<{ blocked: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND cardinality(pg_blocking_pids(pid)) > 0
          AND query ILIKE '%UPDATE%AdminUser%'
      ) AS blocked
    `
    if (result.blocked) {
      return "blocked"
    }
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
  throw new Error("Timed out waiting for the staff mutation outcome")
}

async function waitForBlockedSessionQuery(): Promise<"user-lock" | "session-insert"> {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    const [result] = await prisma.$queryRaw<Array<{ state: "user-lock" | "session-insert" | null }>>`
      SELECT CASE
        WHEN EXISTS (
          SELECT 1
          FROM pg_stat_activity
          WHERE datname = current_database()
            AND cardinality(pg_blocking_pids(pid)) > 0
            AND query LIKE '%admin-session-user-lock%'
        ) THEN 'user-lock'
        WHEN EXISTS (
          SELECT 1
          FROM pg_stat_activity
          WHERE datname = current_database()
            AND cardinality(pg_blocking_pids(pid)) > 0
            AND query ILIKE '%INSERT%AdminSession%'
        ) THEN 'session-insert'
        ELSE NULL
      END AS state
    `
    if (result.state) {
      return result.state
    }
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
  throw new Error("Timed out waiting for session creation to block")
}

async function withoutOtherActiveAdmins<T>(operation: () => Promise<T>): Promise<T> {
  const otherAdmins = await prisma.adminUser.findMany({
    where: {
      role: "ADMIN",
      id: { notIn: fixtureIds },
    },
    select: { id: true, active: true },
  })

  await prisma.adminUser.updateMany({
    where: {
      id: { in: otherAdmins.filter(({ active }) => active).map(({ id }) => id) },
    },
    data: { active: false },
  })

  try {
    return await operation()
  } finally {
    await Promise.all(otherAdmins.map(({ id, active }) =>
      prisma.adminUser.update({ where: { id }, data: { active } })
    ))
  }
}

beforeEach(async () => {
  fixtureSequence += 1
  fixtureIds = []
  actorId = await createFixtureUser({
    label: "actor",
    name: "Same Staff",
    role: "ADMIN",
  })
  backupAdminId = await createFixtureUser({
    label: "backup",
    name: "Alpha Staff",
    role: "ADMIN",
  })
  editorId = await createFixtureUser({
    label: "editor",
    name: "Same Staff",
    role: "EDITOR",
  })
  salesId = await createFixtureUser({
    label: "sales",
    name: "Aardvark Staff",
    role: "SALES",
    active: false,
  })
})

afterEach(async () => {
  if (fixtureIds.length === 0) {
    return
  }
  await prisma.adminUserAuditEvent.deleteMany({
    where: {
      OR: [
        { actorId: { in: fixtureIds } },
        { targetUserId: { in: fixtureIds } },
      ],
    },
  })
  await prisma.adminSession.deleteMany({ where: { adminUserId: { in: fixtureIds } } })
  await prisma.adminUser.deleteMany({ where: { id: { in: fixtureIds } } })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("ADMIN staff account service", () => {
  it("lists deterministic DTOs without password or session fields", async () => {
    await prisma.adminUser.update({ where: { id: salesId }, data: { active: false } })
    await createStoredSession(editorId)

    const users = await listAdminUsers()
    const fixtureUsers = users.filter(({ id }) => fixtureIds.includes(id))

    expect(fixtureUsers.map(({ id }) => id)).toEqual([
      backupAdminId,
      actorId,
      editorId,
      salesId,
    ])
    expect(Object.keys(fixtureUsers[0]).sort()).toEqual([
      "active",
      "createdAt",
      "developmentOnly",
      "email",
      "id",
      "name",
      "role",
      "updatedAt",
    ])
    expect(fixtureUsers[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(fixtureUsers[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(fixtureUsers.find(({ id }) => id === salesId)).toMatchObject({
      active: false,
      developmentOnly: true,
    })

    const serialized = JSON.stringify(fixtureUsers)
    expect(serialized).not.toContain("password")
    expect(serialized).not.toContain("session")
    expect(serialized).not.toContain("token")
    expect(serialized).not.toContain("fixture-hash")
  })

  it("rejects an inactive actor even when the target mutation would otherwise be valid", async () => {
    await expectAdminError(
      changeAdminUserRole({ actorId: salesId, targetUserId: editorId, role: "SALES" }),
      "ACTOR_NOT_AUTHORIZED",
    )
    await expect(prisma.adminUser.findUniqueOrThrow({ where: { id: editorId } })).resolves.toMatchObject({
      role: "EDITOR",
      active: true,
    })
    await expect(prisma.adminUserAuditEvent.count({ where: { targetUserId: editorId } })).resolves.toBe(0)
  })

  it("changes a role, revokes unrevoked sessions, and writes one safe audit", async () => {
    const alreadyRevokedAt = new Date("2026-01-01T00:00:00.000Z")
    await createStoredSession(editorId)
    await createStoredSession(editorId)
    const alreadyRevoked = await createStoredSession(editorId, alreadyRevokedAt)

    const result = await changeAdminUserRole({
      actorId,
      targetUserId: editorId,
      role: "SALES",
    })

    expect(result).toMatchObject({ id: editorId, role: "SALES" })
    const sessions = await prisma.adminSession.findMany({
      where: { adminUserId: editorId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    expect(sessions.every(({ revokedAt }) => revokedAt instanceof Date)).toBe(true)
    expect(sessions.find(({ id }) => id === alreadyRevoked.id)?.revokedAt).toEqual(alreadyRevokedAt)

    const audits = await prisma.adminUserAuditEvent.findMany({
      where: { targetUserId: editorId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({
      actorId,
      targetUserId: editorId,
      action: "ROLE_CHANGED",
      metadata: { previousRole: "EDITOR", nextRole: "SALES" },
    })
    expect(Object.keys(audits[0].metadata as object).sort()).toEqual([
      "nextRole",
      "previousRole",
    ])
    expect(JSON.stringify(audits[0])).not.toMatch(/password|hash|session|token/i)
  })

  it("does not audit or revoke sessions for no-op role and active requests", async () => {
    const session = await createStoredSession(editorId)

    const sameRole = await changeAdminUserRole({
      actorId,
      targetUserId: editorId,
      role: "EDITOR",
    })
    const sameActive = await setAdminUserActive({
      actorId,
      targetUserId: editorId,
      active: true,
    })

    expect(sameRole).toMatchObject({ id: editorId, role: "EDITOR" })
    expect(sameActive).toMatchObject({ id: editorId, active: true })
    await expect(prisma.adminSession.findUniqueOrThrow({ where: { id: session.id } })).resolves.toMatchObject({
      revokedAt: null,
    })
    await expect(prisma.adminUserAuditEvent.count({ where: { targetUserId: editorId } })).resolves.toBe(0)
  })

  it("deactivates and activates a user with session revocation and safe audits", async () => {
    const initialSession = await createStoredSession(editorId)

    const deactivated = await setAdminUserActive({
      actorId,
      targetUserId: editorId,
      active: false,
    })

    expect(deactivated).toMatchObject({ id: editorId, active: false })
    await expect(prisma.adminSession.findUniqueOrThrow({ where: { id: initialSession.id } })).resolves.toMatchObject({
      revokedAt: expect.any(Date),
    })

    const staleSession = await createStoredSession(editorId)
    const activated = await setAdminUserActive({
      actorId,
      targetUserId: editorId,
      active: true,
    })

    expect(activated).toMatchObject({ id: editorId, active: true })
    await expect(prisma.adminSession.findUniqueOrThrow({ where: { id: staleSession.id } })).resolves.toMatchObject({
      revokedAt: expect.any(Date),
    })
    const audits = await prisma.adminUserAuditEvent.findMany({
      where: { targetUserId: editorId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    expect(audits).toHaveLength(2)
    expect(audits[0]).toMatchObject({
      actorId,
      action: "DEACTIVATED",
      metadata: { previousActive: true, nextActive: false },
    })
    expect(audits[1]).toMatchObject({
      actorId,
      action: "ACTIVATED",
      metadata: { previousActive: false, nextActive: true },
    })
    expect(audits.map(({ metadata }) => Object.keys(metadata as object).sort())).toEqual([
      ["nextActive", "previousActive"],
      ["nextActive", "previousActive"],
    ])
  })

  it("rejects self-deactivation without changing data or sessions", async () => {
    const session = await createStoredSession(actorId)

    await expectAdminError(
      setAdminUserActive({ actorId, targetUserId: actorId, active: false }),
      "SELF_DEACTIVATION_FORBIDDEN",
    )

    await expect(prisma.adminUser.findUniqueOrThrow({ where: { id: actorId } })).resolves.toMatchObject({
      active: true,
      role: "ADMIN",
    })
    await expect(prisma.adminSession.findUniqueOrThrow({ where: { id: session.id } })).resolves.toMatchObject({
      revokedAt: null,
    })
    await expect(prisma.adminUserAuditEvent.count({ where: { targetUserId: actorId } })).resolves.toBe(0)
  })

  it("rejects self-demotion without changing data or sessions", async () => {
    const session = await createStoredSession(actorId)

    await expectAdminError(
      changeAdminUserRole({ actorId, targetUserId: actorId, role: "EDITOR" }),
      "SELF_DEMOTION_FORBIDDEN",
    )

    await expect(prisma.adminUser.findUniqueOrThrow({ where: { id: actorId } })).resolves.toMatchObject({
      active: true,
      role: "ADMIN",
    })
    await expect(prisma.adminSession.findUniqueOrThrow({ where: { id: session.id } })).resolves.toMatchObject({
      revokedAt: null,
    })
    await expect(prisma.adminUserAuditEvent.count({ where: { targetUserId: actorId } })).resolves.toBe(0)
  })

  it("rejects an inactive actor before final-active-ADMIN checks", async () => {
    await withoutOtherActiveAdmins(async () => {
      await prisma.adminUser.update({ where: { id: backupAdminId }, data: { active: false } })
      const session = await createStoredSession(actorId)

      await expectAdminError(
        setAdminUserActive({ actorId: salesId, targetUserId: actorId, active: false }),
        "ACTOR_NOT_AUTHORIZED",
      )
      await expectAdminError(
        changeAdminUserRole({ actorId: salesId, targetUserId: actorId, role: "EDITOR" }),
        "ACTOR_NOT_AUTHORIZED",
      )

      await expect(prisma.adminUser.findUniqueOrThrow({ where: { id: actorId } })).resolves.toMatchObject({
        active: true,
        role: "ADMIN",
      })
      await expect(prisma.adminSession.findUniqueOrThrow({ where: { id: session.id } })).resolves.toMatchObject({
        revokedAt: null,
      })
      await expect(prisma.adminUserAuditEvent.count({ where: { targetUserId: actorId } })).resolves.toBe(0)
    })
  })

  it("keeps one active ADMIN when two removals race", async () => {
    await withoutOtherActiveAdmins(async () => {
      await prisma.adminUser.update({ where: { id: salesId }, data: { active: false } })

      const results = await Promise.allSettled([
        setAdminUserActive({ actorId, targetUserId: actorId, active: false }),
        setAdminUserActive({ actorId, targetUserId: backupAdminId, active: false }),
      ])

      const fulfilled = results.filter(({ status }) => status === "fulfilled")
      const rejected = results.filter(({ status }) => status === "rejected")
      expect(fulfilled).toHaveLength(1)
      expect(rejected).toHaveLength(1)
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(AdminServiceError)
      expect(["LAST_ACTIVE_ADMIN", "SELF_DEACTIVATION_FORBIDDEN"]).toContain(
        ((rejected[0] as PromiseRejectedResult).reason as AdminServiceError).code,
      )
      await expect(prisma.adminUser.count({
        where: { role: "ADMIN", active: true },
      })).resolves.toBe(1)
      await expect(prisma.adminUserAuditEvent.count({
        where: {
          targetUserId: { in: [actorId, backupAdminId] },
          action: "DEACTIVATED",
        },
      })).resolves.toBe(1)
    })
  })

  it("rejects distinct long passwords at the 72-byte boundary", async () => {
    const firstPassword = `a${"你".repeat(24)}A1!`
    const secondPassword = `a${"你".repeat(24)}B1!`

    await resetAdminUserPassword({ actorId, targetUserId: editorId, password: firstPassword })
    const stored = await prisma.adminUser.findUniqueOrThrow({
      where: { id: editorId },
      select: { passwordHash: true },
    })

    await expect(verifyPassword(firstPassword, stored.passwordHash)).resolves.toBe(true)
    await expect(verifyPassword(secondPassword, stored.passwordHash)).resolves.toBe(false)
  })

  it("rejects distinct multibyte passwords at the 72-byte boundary", async () => {
    const firstPassword = `a${"你".repeat(23)}A1!`
    const secondPassword = `a${"你".repeat(23)}B1!`

    await resetAdminUserPassword({ actorId, targetUserId: editorId, password: firstPassword })
    const stored = await prisma.adminUser.findUniqueOrThrow({
      where: { id: editorId },
      select: { passwordHash: true },
    })

    await expect(verifyPassword(firstPassword, stored.passwordHash)).resolves.toBe(true)
    await expect(verifyPassword(secondPassword, stored.passwordHash)).resolves.toBe(false)
  })

  it("resets a password exactly as submitted, revokes sessions, and writes a secret-free audit", async () => {
    const submittedPassword = "  StrongPassword9!  "
    const previousHash = (await prisma.adminUser.findUniqueOrThrow({
      where: { id: editorId },
      select: { passwordHash: true },
    })).passwordHash
    await createStoredSession(editorId)
    await createStoredSession(editorId)

    await resetAdminUserPassword({
      actorId,
      targetUserId: editorId,
      password: submittedPassword,
    })

    const stored = await prisma.adminUser.findUniqueOrThrow({
      where: { id: editorId },
      select: { passwordHash: true },
    })
    expect(stored.passwordHash).not.toBe(previousHash)
    expect(stored.passwordHash).not.toContain(submittedPassword)
    await expect(verifyPassword(submittedPassword, stored.passwordHash)).resolves.toBe(true)
    await expect(verifyPassword(submittedPassword.trim(), stored.passwordHash)).resolves.toBe(false)
    const sessions = await prisma.adminSession.findMany({ where: { adminUserId: editorId } })
    expect(sessions.every(({ revokedAt }) => revokedAt instanceof Date)).toBe(true)

    const audits = await prisma.adminUserAuditEvent.findMany({
      where: { targetUserId: editorId, action: "PASSWORD_RESET" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({ actorId, targetUserId: editorId, metadata: null })
    expect(JSON.stringify(audits[0].metadata)).not.toMatch(/password|hash|session|token|StrongPassword/i)
  })

  it.each([
    undefined,
    12345,
    "Short1!a",
    "           Aa1!",
    "UPPERCASE123!",
    "lowercase123!",
    "NoDigitsHere!",
    "NoSymbolsHere123",
    `Aa1!${"x".repeat(1021)}`,
  ])("rejects an invalid password without side effects: %j", async (password) => {
    const before = await prisma.adminUser.findUniqueOrThrow({
      where: { id: editorId },
      select: { passwordHash: true },
    })
    const session = await createStoredSession(editorId)

    await expectAdminError(
      resetAdminUserPassword({ actorId, targetUserId: editorId, password }),
      "INVALID_PASSWORD",
    )

    await expect(prisma.adminUser.findUniqueOrThrow({ where: { id: editorId } })).resolves.toMatchObject({
      passwordHash: before.passwordHash,
    })
    await expect(prisma.adminSession.findUniqueOrThrow({ where: { id: session.id } })).resolves.toMatchObject({
      revokedAt: null,
    })
    await expect(prisma.adminUserAuditEvent.count({ where: { targetUserId: editorId } })).resolves.toBe(0)
  })

  it("returns stable typed errors for invalid identifiers and missing users", async () => {
    const missingActorId = randomUUID()
    const missingTargetUserId = randomUUID()
    const session = await createStoredSession(editorId)

    await expectAdminError(
      changeAdminUserRole({ actorId: "not-a-uuid", targetUserId: editorId, role: "SALES" }),
      "INVALID_ENTITY_ID",
    )
    await expectAdminError(
      setAdminUserActive({ actorId, targetUserId: undefined as unknown as string, active: false }),
      "INVALID_ENTITY_ID",
    )
    await expectAdminError(
      changeAdminUserRole({ actorId: missingActorId, targetUserId: editorId, role: "SALES" }),
      "ACTOR_NOT_FOUND",
    )
    await expectAdminError(
      resetAdminUserPassword({
        actorId,
        targetUserId: missingTargetUserId,
        password: "ValidPassword9!",
      }),
      "ADMIN_USER_NOT_FOUND",
    )

    await expect(prisma.adminUser.findUniqueOrThrow({ where: { id: editorId } })).resolves.toMatchObject({
      role: "EDITOR",
      active: true,
    })
    await expect(prisma.adminSession.findUniqueOrThrow({ where: { id: session.id } })).resolves.toMatchObject({
      revokedAt: null,
    })
    await expect(prisma.adminUserAuditEvent.count({ where: { targetUserId: editorId } })).resolves.toBe(0)
  })

  it("does not allow a session created from stale login state to survive deactivation", async () => {
    const password = "ConcurrentLoginPassword9!"
    await prisma.adminUser.update({
      where: { id: editorId },
      data: { passwordHash: await hashPassword(password), active: true },
    })

    const staleLogin = await prisma.adminUser.findUniqueOrThrow({
      where: { id: editorId },
      select: { id: true, active: true, authVersion: true, passwordHash: true },
    })
    await setAdminUserActive({ actorId, targetUserId: editorId, active: false })

    await expect(createAdminSession({
      adminUserId: staleLogin.id,
      authVersion: staleLogin.authVersion,
    })).rejects.toThrow("UNAUTHORIZED")
  })

  it("does not let deactivation commit before an in-flight session transaction", async () => {
    let releaseSessionTransaction: (() => void) | undefined
    let sessionTransactionLocked: (() => void) | undefined
    const release = new Promise<void>((resolve) => {
      releaseSessionTransaction = resolve
    })
    const locked = new Promise<void>((resolve) => {
      sessionTransactionLocked = resolve
    })
    const inFlightToken = `${"a".repeat(43)}`

    const sessionTransaction = prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT id FROM "AdminUser" WHERE id = ${editorId}::uuid FOR UPDATE
      `
      sessionTransactionLocked?.()
      await release
      await transaction.adminSession.create({
        data: {
          tokenHash: createHash("sha256").update(inFlightToken).digest("hex"),
          adminUserId: editorId,
          authVersion: 0,
          expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        },
      })
    })
    await locked

    let deactivationSettled = false
    const deactivation = setAdminUserActive({ actorId, targetUserId: editorId, active: false })
      .finally(() => {
        deactivationSettled = true
      })
    let outcome: "blocked" | "settled" | undefined
    try {
      outcome = await waitForBlockedAdminUserUpdateOrSettlement(() => deactivationSettled)
    } finally {
      releaseSessionTransaction?.()
    }

    await Promise.all([sessionTransaction, deactivation])
    expect(outcome).toBe("blocked")
    await expect(prisma.adminSession.findUniqueOrThrow({
      where: {
        tokenHash: createHash("sha256").update(inFlightToken).digest("hex"),
      },
    })).resolves.toMatchObject({ revokedAt: null, authVersion: 0 })
    await expect(readAdminSession(inFlightToken)).resolves.toBeNull()
  })

  it("does not let a session committed before an in-flight password reset stay usable", async () => {
    let releaseSessionTransaction: (() => void) | undefined
    let sessionTransactionLocked: (() => void) | undefined
    const release = new Promise<void>((resolve) => {
      releaseSessionTransaction = resolve
    })
    const locked = new Promise<void>((resolve) => {
      sessionTransactionLocked = resolve
    })
    const inFlightToken = `${"b".repeat(43)}`

    const sessionTransaction = prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT id FROM "AdminUser" WHERE id = ${editorId}::uuid FOR UPDATE
      `
      sessionTransactionLocked?.()
      await release
      await transaction.adminSession.create({
        data: {
          tokenHash: createHash("sha256").update(inFlightToken).digest("hex"),
          adminUserId: editorId,
          authVersion: 0,
          expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        },
      })
    })
    await locked

    let resetSettled = false
    const passwordReset = resetAdminUserPassword({
      actorId,
      targetUserId: editorId,
      password: "RaceResetPassword9!",
    }).finally(() => {
      resetSettled = true
    })
    let outcome: "blocked" | "settled" | undefined
    try {
      outcome = await waitForBlockedAdminUserUpdateOrSettlement(() => resetSettled)
    } finally {
      releaseSessionTransaction?.()
    }

    await Promise.all([sessionTransaction, passwordReset])
    expect(outcome).toBe("blocked")
    await expect(prisma.adminSession.findUniqueOrThrow({
      where: {
        tokenHash: createHash("sha256").update(inFlightToken).digest("hex"),
      },
    })).resolves.toMatchObject({ revokedAt: null, authVersion: 0 })
    await expect(readAdminSession(inFlightToken)).resolves.toBeNull()
  })

  it("rejects stale session creation when it waits behind an in-flight deactivation", async () => {
    const staleLogin = await prisma.adminUser.findUniqueOrThrow({
      where: { id: editorId },
      select: { authVersion: true },
    })
    let releaseDeactivationTransaction: (() => void) | undefined
    let deactivationTransactionLocked: (() => void) | undefined
    const release = new Promise<void>((resolve) => {
      releaseDeactivationTransaction = resolve
    })
    const locked = new Promise<void>((resolve) => {
      deactivationTransactionLocked = resolve
    })

    const deactivationTransaction = prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT id FROM "AdminUser" WHERE id = ${editorId}::uuid FOR UPDATE
      `
      await transaction.adminUser.update({
        where: { id: editorId },
        data: { active: false, authVersion: { increment: 1 } },
      })
      deactivationTransactionLocked?.()
      await release
    })
    await locked

    const sessionCreation = createAdminSession({
      adminUserId: editorId,
      authVersion: staleLogin.authVersion,
    })
    let blockedState: "user-lock" | "session-insert" | undefined
    try {
      blockedState = await waitForBlockedSessionQuery()
    } finally {
      releaseDeactivationTransaction?.()
    }

    await deactivationTransaction
    expect(blockedState).toBe("user-lock")
    await expect(sessionCreation).rejects.toThrow("UNAUTHORIZED")
    await expect(prisma.adminSession.count({ where: { adminUserId: editorId } })).resolves.toBe(0)
  })

  it("returns stable typed errors for invalid role and active values", async () => {
    const session = await createStoredSession(editorId)

    await expectAdminError(
      changeAdminUserRole({ actorId, targetUserId: editorId, role: "OWNER" }),
      "INVALID_USER_ROLE",
    )
    await expectAdminError(
      changeAdminUserRole({ actorId, targetUserId: editorId, role: undefined }),
      "INVALID_USER_ROLE",
    )
    await expectAdminError(
      setAdminUserActive({ actorId, targetUserId: editorId, active: "false" }),
      "INVALID_ACTIVE_STATE",
    )
    await expectAdminError(
      setAdminUserActive({ actorId, targetUserId: editorId, active: undefined }),
      "INVALID_ACTIVE_STATE",
    )

    await expect(prisma.adminUser.findUniqueOrThrow({ where: { id: editorId } })).resolves.toMatchObject({
      role: "EDITOR",
      active: true,
    })
    await expect(prisma.adminSession.findUniqueOrThrow({ where: { id: session.id } })).resolves.toMatchObject({
      revokedAt: null,
    })
    await expect(prisma.adminUserAuditEvent.count({ where: { targetUserId: editorId } })).resolves.toBe(0)
  })
})
