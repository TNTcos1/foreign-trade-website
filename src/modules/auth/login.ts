import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/modules/auth/password"
import { createAdminSession } from "@/modules/auth/session"

const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 1_024
const DUMMY_PASSWORD_HASH = "$2b$12$BXjtdgB28MrLeJOuvFZTz.qkYDEe9q8M.NH6fSzLiEAd00vgV3D/C"

type LoginValidationResult =
  | { success: true; email: string; password: string }
  | { success: false }

export function validateAdminLogin(value: unknown): LoginValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false }
  }
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.email !== "string" ||
    typeof candidate.password !== "string"
  ) {
    return { success: false }
  }
  const email = candidate.email.trim().toLowerCase()
  if (
    !email ||
    email.length > MAX_EMAIL_LENGTH ||
    !email.includes("@") ||
    !candidate.password ||
    candidate.password.length > MAX_PASSWORD_LENGTH
  ) {
    return { success: false }
  }
  return { success: true, email, password: candidate.password }
}

export async function loginAdmin(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      authVersion: true,
      passwordHash: true,
    },
  })
  const validPassword = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
  if (!user || !user.active || !validPassword) {
    return null
  }
  const session = await createAdminSession({
    adminUserId: user.id,
    authVersion: user.authVersion,
  })
  return {
    ...session,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  }
}
