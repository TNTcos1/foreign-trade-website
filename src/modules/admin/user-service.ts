import { Prisma, type UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/modules/auth/password"
import { AdminServiceError, validateEntityId } from "@/modules/admin/validation"

const SERIALIZABLE_ATTEMPTS = 3

const adminUserViewSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  developmentOnly: true,
  createdAt: true,
  updatedAt: true,
} as const

type AdminUserRecord = Prisma.AdminUserGetPayload<{
  select: typeof adminUserViewSelect
}>

export type AdminUserView = {
  id: string
  email: string
  name: string
  role: "ADMIN" | "EDITOR" | "SALES"
  active: boolean
  developmentOnly: boolean
  createdAt: string
  updatedAt: string
}

function toAdminUserView(user: AdminUserRecord): AdminUserView {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    developmentOnly: user.developmentOnly,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

function validateRole(value: unknown): UserRole {
  if (value !== "ADMIN" && value !== "EDITOR" && value !== "SALES") {
    throw new AdminServiceError("INVALID_USER_ROLE")
  }
  return value
}

function validateActive(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new AdminServiceError("INVALID_ACTIVE_STATE")
  }
  return value
}

function validatePassword(value: unknown): string {
  if (typeof value !== "string") {
    throw new AdminServiceError("INVALID_PASSWORD")
  }
  const validationValue = value.trim()
  if (
    validationValue.length < 12 ||
    validationValue.length > 1024 ||
    !/[a-z]/.test(validationValue) ||
    !/[A-Z]/.test(validationValue) ||
    !/\d/.test(validationValue) ||
    !/[^A-Za-z0-9]/.test(validationValue)
  ) {
    throw new AdminServiceError("INVALID_PASSWORD")
  }
  return value
}

async function requireActor(
  transaction: Prisma.TransactionClient,
  actorId: string,
): Promise<void> {
  const actor = await transaction.adminUser.findUnique({
    where: { id: actorId },
    select: { id: true, role: true, active: true },
  })
  if (!actor) {
    throw new AdminServiceError("ACTOR_NOT_FOUND")
  }
  if (actor.role !== "ADMIN" || !actor.active) {
    throw new AdminServiceError("ACTOR_NOT_AUTHORIZED")
  }
}

async function requireTarget(
  transaction: Prisma.TransactionClient,
  targetUserId: string,
): Promise<AdminUserRecord> {
  const target = await transaction.adminUser.findUnique({
    where: { id: targetUserId },
    select: adminUserViewSelect,
  })
  if (!target) {
    throw new AdminServiceError("ADMIN_USER_NOT_FOUND")
  }
  return target
}

async function revokeTargetSessions(
  transaction: Prisma.TransactionClient,
  targetUserId: string,
): Promise<void> {
  await transaction.adminSession.updateMany({
    where: {
      adminUserId: targetUserId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  })
}

async function assertAnotherActiveAdmin(
  transaction: Prisma.TransactionClient,
  targetUserId: string,
): Promise<void> {
  const anotherActiveAdmin = await transaction.adminUser.findFirst({
    where: {
      id: { not: targetUserId },
      role: "ADMIN",
      active: true,
    },
    select: { id: true },
  })
  if (!anotherActiveAdmin) {
    throw new AdminServiceError("LAST_ACTIVE_ADMIN")
  }
}

async function withSerializableRetry<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < SERIALIZABLE_ATTEMPTS - 1
      ) {
        continue
      }
      throw error
    }
  }

  throw new Error("Unreachable serializable transaction retry state")
}

export async function listAdminUsers(): Promise<AdminUserView[]> {
  const users = await prisma.adminUser.findMany({
    orderBy: [
      { active: "desc" },
      { name: "asc" },
      { email: "asc" },
    ],
    select: adminUserViewSelect,
  })
  return users.map(toAdminUserView)
}

export async function changeAdminUserRole(input: {
  actorId: string
  targetUserId: string
  role: unknown
}): Promise<AdminUserView> {
  const actorId = validateEntityId(input.actorId)
  const targetUserId = validateEntityId(input.targetUserId)
  const role = validateRole(input.role)

  return withSerializableRetry(async (transaction) => {
    await requireActor(transaction, actorId)
    const target = await requireTarget(transaction, targetUserId)

    if (target.role === role) {
      return toAdminUserView(target)
    }
    if (target.role === "ADMIN" && target.active && role !== "ADMIN") {
      await assertAnotherActiveAdmin(transaction, targetUserId)
    }
    if (actorId === targetUserId && target.role === "ADMIN" && role !== "ADMIN") {
      throw new AdminServiceError("SELF_DEMOTION_FORBIDDEN")
    }

    const updated = await transaction.adminUser.update({
      where: { id: targetUserId },
      data: { role, authVersion: { increment: 1 } },
      select: adminUserViewSelect,
    })
    await revokeTargetSessions(transaction, targetUserId)
    await transaction.adminUserAuditEvent.create({
      data: {
        actorId,
        targetUserId,
        action: "ROLE_CHANGED",
        metadata: {
          previousRole: target.role,
          nextRole: role,
        },
      },
    })
    return toAdminUserView(updated)
  })
}

export async function setAdminUserActive(input: {
  actorId: string
  targetUserId: string
  active: unknown
}): Promise<AdminUserView> {
  const actorId = validateEntityId(input.actorId)
  const targetUserId = validateEntityId(input.targetUserId)
  const active = validateActive(input.active)

  return withSerializableRetry(async (transaction) => {
    await requireActor(transaction, actorId)
    const target = await requireTarget(transaction, targetUserId)

    if (target.active === active) {
      return toAdminUserView(target)
    }
    if (target.role === "ADMIN" && target.active && !active) {
      await assertAnotherActiveAdmin(transaction, targetUserId)
    }
    if (actorId === targetUserId && !active) {
      throw new AdminServiceError("SELF_DEACTIVATION_FORBIDDEN")
    }

    const updated = await transaction.adminUser.update({
      where: { id: targetUserId },
      data: { active, authVersion: { increment: 1 } },
      select: adminUserViewSelect,
    })
    await revokeTargetSessions(transaction, targetUserId)
    await transaction.adminUserAuditEvent.create({
      data: {
        actorId,
        targetUserId,
        action: active ? "ACTIVATED" : "DEACTIVATED",
        metadata: {
          previousActive: target.active,
          nextActive: active,
        },
      },
    })
    return toAdminUserView(updated)
  })
}

export async function resetAdminUserPassword(input: {
  actorId: string
  targetUserId: string
  password: unknown
}): Promise<void> {
  const actorId = validateEntityId(input.actorId)
  const targetUserId = validateEntityId(input.targetUserId)
  const password = validatePassword(input.password)
  const passwordHash = await hashPassword(password)

  await withSerializableRetry(async (transaction) => {
    await requireActor(transaction, actorId)
    await requireTarget(transaction, targetUserId)

    await transaction.adminUser.update({
      where: { id: targetUserId },
      data: { passwordHash, authVersion: { increment: 1 } },
    })
    await revokeTargetSessions(transaction, targetUserId)
    await transaction.adminUserAuditEvent.create({
      data: {
        actorId,
        targetUserId,
        action: "PASSWORD_RESET",
        metadata: Prisma.DbNull,
      },
    })
  })
}
