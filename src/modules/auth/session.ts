import { createHash, randomBytes } from "node:crypto"

import { Prisma, type UserRole } from "@prisma/client"
import type { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"

const SESSION_DURATION_MS = 12 * 60 * 60 * 1_000
const SESSION_TOKEN_BYTES = 32

export const ADMIN_SESSION_COOKIE = "harbor-stock-admin-session"

export type AdminSession = {
  sessionId: string
  expiresAt: Date
  user: {
    id: string
    email: string
    name: string
    role: UserRole
  }
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function isSessionToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}

export async function createAdminSession({
  adminUserId,
  authVersion,
  now = new Date(),
  expiresAt = new Date(now.getTime() + SESSION_DURATION_MS),
}: {
  adminUserId: string
  authVersion?: number
  now?: Date
  expiresAt?: Date
}): Promise<{ sessionId: string; token: string; expiresAt: Date }> {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("base64url")
  const session = await prisma.$transaction(async (transaction) => {
    const [user] = await transaction.$queryRaw<Array<{ active: boolean; authVersion: number }>>(
      Prisma.sql`
        /* admin-session-user-lock */
        SELECT "active", "authVersion"
        FROM "AdminUser"
        WHERE "id" = ${adminUserId}::uuid
        FOR UPDATE
      `,
    )
    if (!user || !user.active || (authVersion !== undefined && user.authVersion !== authVersion)) {
      throw new AuthenticationError()
    }
    return transaction.adminSession.create({
      data: {
        tokenHash: hashSessionToken(token),
        adminUserId,
        authVersion: user.authVersion,
        expiresAt,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    })
  })
  return {
    sessionId: session.id,
    token,
    expiresAt: session.expiresAt,
  }
}

export async function readAdminSession(
  token: string,
  now = new Date(),
): Promise<AdminSession | null> {
  if (!isSessionToken(token)) {
    return null
  }
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      authVersion: true,
      adminUser: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          authVersion: true,
        },
      },
    },
  })
  if (
    !session ||
    session.revokedAt !== null ||
    session.expiresAt <= now ||
    !session.adminUser.active ||
    session.authVersion !== session.adminUser.authVersion
  ) {
    return null
  }
  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    user: {
      id: session.adminUser.id,
      email: session.adminUser.email,
      name: session.adminUser.name,
      role: session.adminUser.role,
    },
  }
}

export async function revokeAdminSession(token: string, now = new Date()): Promise<void> {
  if (!isSessionToken(token)) {
    return
  }
  await prisma.adminSession.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
    },
    data: { revokedAt: now },
  })
}

export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? null
}

export async function requireSessionToken(
  token: string | undefined,
): Promise<AdminSession> {
  const session = token ? await readAdminSession(token) : null
  if (!session) {
    throw new AuthenticationError()
  }
  return session
}

export async function requireSession(request: NextRequest): Promise<AdminSession> {
  return requireSessionToken(getSessionToken(request) ?? undefined)
}

export class AuthenticationError extends Error {
  constructor(message = "UNAUTHORIZED") {
    super(message)
    this.name = "AuthenticationError"
  }
}
