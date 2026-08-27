import type { UserRole } from "@prisma/client"

export const permissions = [
  "settings:update",
  "users:manage",
  "products:manage",
  "content:manage",
  "media:manage",
  "translations:manage",
  "leads:assigned:update",
  "leads:any:update",
] as const

export type Permission = (typeof permissions)[number]

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  ADMIN: new Set(permissions),
  EDITOR: new Set([
    "products:manage",
    "content:manage",
    "media:manage",
    "translations:manage",
  ]),
  SALES: new Set(["leads:assigned:update"]),
}

export class AuthorizationError extends Error {
  constructor() {
    super("FORBIDDEN")
    this.name = "AuthorizationError"
  }
}

export function can(role: UserRole, permission: Permission): boolean {
  return permissions.includes(permission) && rolePermissions[role].has(permission)
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new AuthorizationError()
  }
}
