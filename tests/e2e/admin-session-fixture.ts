import { randomUUID } from "node:crypto"

import type { Page } from "@playwright/test"
import type { UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/modules/auth/password"
import { ADMIN_SESSION_COOKIE, createAdminSession } from "@/modules/auth/session"

export async function installSeedAdminSession(page: Page, email: string): Promise<void> {
  await page.goto("/admin/login")
  const user = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true, active: true },
  })
  if (!user?.active) {
    throw new Error(`Active seed user ${email} is required for admin browser acceptance.`)
  }

  const session = await createAdminSession({ adminUserId: user.id })
  await page.context().addCookies([{
    name: ADMIN_SESSION_COOKIE,
    value: session.token,
    url: new URL(page.url()).origin,
    httpOnly: true,
    sameSite: "Lax",
    expires: Math.floor(session.expiresAt.getTime() / 1_000),
  }])
  await page.goto("/admin")
}

export async function createTemporaryLoginUser(role: UserRole = "SALES"): Promise<{
  id: string
  email: string
  password: string
}> {
  const uniqueId = randomUUID()
  const email = `playwright-auth-${uniqueId}@clearance.local.invalid`
  const password = `Task8D-${randomUUID()}!`
  const user = await prisma.adminUser.create({
    data: {
      email,
      name: "Playwright Authentication Fixture",
      passwordHash: await hashPassword(password),
      role,
      active: true,
      developmentOnly: true,
    },
    select: { id: true },
  })
  return { id: user.id, email, password }
}

export async function removeTemporaryLoginUser(userId: string): Promise<void> {
  await prisma.adminUser.deleteMany({ where: { id: userId } })
}
