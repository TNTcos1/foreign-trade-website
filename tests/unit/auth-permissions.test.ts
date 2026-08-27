// @vitest-environment node

import { describe, expect, it } from "vitest"

import { AuthorizationError, can, requirePermission } from "@/modules/auth/permissions"

describe("admin role permissions", () => {
  it("keeps settings and user management admin-only", () => {
    expect(can("ADMIN", "settings:update")).toBe(true)
    expect(can("ADMIN", "users:manage")).toBe(true)
    expect(can("EDITOR", "settings:update")).toBe(false)
    expect(can("SALES", "users:manage")).toBe(false)
  })

  it("allows editors to manage catalog content but not leads or users", () => {
    expect(can("EDITOR", "products:manage")).toBe(true)
    expect(can("EDITOR", "content:manage")).toBe(true)
    expect(can("EDITOR", "media:manage")).toBe(true)
    expect(can("EDITOR", "translations:manage")).toBe(true)
    expect(can("EDITOR", "leads:assigned:update")).toBe(false)
  })

  it("limits sales users to assigned lead work", () => {
    expect(can("SALES", "leads:assigned:update")).toBe(true)
    expect(can("SALES", "leads:any:update")).toBe(false)
    expect(can("SALES", "products:manage")).toBe(false)
  })

  it("fails closed for unknown permissions", () => {
    expect(can("ADMIN", "unknown:permission" as never)).toBe(false)
    expect(() => requirePermission("EDITOR", "users:manage")).toThrow(AuthorizationError)
  })
})
