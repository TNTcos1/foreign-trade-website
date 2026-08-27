// @vitest-environment node

import type { UserRole } from "@prisma/client"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  listAdminUsers: vi.fn(),
  changeAdminUserRole: vi.fn(),
  setAdminUserActive: vi.fn(),
  resetAdminUserPassword: vi.fn(),
}))

vi.mock("@/modules/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/auth/session")>()),
  requireSession: mocks.requireSession,
}))

vi.mock("@/modules/admin/user-service", () => ({
  listAdminUsers: mocks.listAdminUsers,
  changeAdminUserRole: mocks.changeAdminUserRole,
  setAdminUserActive: mocks.setAdminUserActive,
  resetAdminUserPassword: mocks.resetAdminUserPassword,
}))

import { GET as listUsers } from "@/app/api/admin/users/route"
import { POST as mutateUser } from "@/app/api/admin/users/[id]/route"
import { AuthenticationError } from "@/modules/auth/session"
import { AdminServiceError } from "@/modules/admin/validation"

const actorId = "00000000-0000-4000-8000-000000000001"
const targetId = "00000000-0000-4000-8000-000000000002"

const user = {
  id: targetId,
  email: "editor@example.test",
  name: "Editor",
  role: "EDITOR" as const,
  active: true,
  developmentOnly: false,
  createdAt: "2026-08-17T10:00:00.000Z",
  updatedAt: "2026-08-17T10:00:00.000Z",
}

function adminSession(role: UserRole = "ADMIN") {
  return {
    sessionId: "session-id",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    user: {
      id: actorId,
      email: "admin@example.test",
      name: "Admin",
      role,
    },
  }
}

function request(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new NextRequest(`https://admin.example.test${path}`, {
    method,
    headers: {
      ...(method === "POST"
        ? {
            origin: "https://admin.example.test",
            "content-type": "application/json",
          }
        : {}),
      ...headers,
    },
    ...(body === undefined
      ? {}
      : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  })
}

function mutationRequest(body: unknown, headers: Record<string, string> = {}) {
  return request(`/api/admin/users/${targetId}`, "POST", body, headers)
}

function mutationContext(id = targetId) {
  return { params: Promise.resolve({ id }) }
}

function guardedMutationContext(onConsumed: () => void) {
  return {
    params: {
      then() {
        onConsumed()
        throw new Error("route params consumed before authorization")
      },
    } as unknown as Promise<{ id: string }>,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireSession.mockResolvedValue(adminSession())
  mocks.listAdminUsers.mockResolvedValue([user])
  mocks.changeAdminUserRole.mockResolvedValue({ ...user, role: "SALES" })
  mocks.setAdminUserActive.mockResolvedValue({ ...user, active: false })
  mocks.resetAdminUserPassword.mockResolvedValue(undefined)
})

describe("admin user routes", () => {
  it("requires authentication before reading a malformed list request", async () => {
    mocks.requireSession.mockRejectedValueOnce(new AuthenticationError())

    const response = await listUsers(request("/api/admin/users", "GET"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "UNAUTHORIZED" })
    expect(mocks.listAdminUsers).not.toHaveBeenCalled()
  })

  it("requires authentication before reading a malformed mutation body", async () => {
    mocks.requireSession.mockRejectedValueOnce(new AuthenticationError())

    const response = await mutateUser(
      mutationRequest("{"),
      mutationContext(),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "UNAUTHORIZED" })
    expect(mocks.changeAdminUserRole).not.toHaveBeenCalled()
    expect(mocks.setAdminUserActive).not.toHaveBeenCalled()
    expect(mocks.resetAdminUserPassword).not.toHaveBeenCalled()
  })

  it.each([
    ["EDITOR", "list", () => listUsers(request("/api/admin/users", "GET"))],
    ["SALES", "list", () => listUsers(request("/api/admin/users", "GET"))],
  ] satisfies [UserRole, string, () => Promise<Response>][]) (
    "denies %s %s access before service execution",
    async (role, _, handler) => {
      mocks.requireSession.mockResolvedValueOnce(adminSession(role))

      const response = await handler()

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ ok: false, code: "FORBIDDEN" })
      expect(mocks.listAdminUsers).not.toHaveBeenCalled()
      expect(mocks.changeAdminUserRole).not.toHaveBeenCalled()
      expect(mocks.setAdminUserActive).not.toHaveBeenCalled()
      expect(mocks.resetAdminUserPassword).not.toHaveBeenCalled()
    },
  )

  it.each(["EDITOR", "SALES"] satisfies UserRole[])(
    "denies %s mutation access before body parsing or param resolution",
    async (role) => {
      mocks.requireSession.mockResolvedValueOnce(adminSession(role))
      const paramsConsumed = vi.fn()

      const response = await mutateUser(
        mutationRequest("{"),
        guardedMutationContext(paramsConsumed),
      )

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ ok: false, code: "FORBIDDEN" })
      expect(paramsConsumed).not.toHaveBeenCalled()
      expect(mocks.changeAdminUserRole).not.toHaveBeenCalled()
      expect(mocks.setAdminUserActive).not.toHaveBeenCalled()
      expect(mocks.resetAdminUserPassword).not.toHaveBeenCalled()
    },
  )

  it("lists the existing staff users for an ADMIN", async () => {
    const response = await listUsers(request("/api/admin/users", "GET"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, users: [user] })
    expect(mocks.listAdminUsers).toHaveBeenCalledOnce()
  })

  it("hides unexpected list failures behind a generic 503", async () => {
    mocks.listAdminUsers.mockRejectedValueOnce(new Error("database host leaked"))

    const response = await listUsers(request("/api/admin/users", "GET"))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "USER_LIST_UNAVAILABLE",
    })
  })

  it("rejects a cross-origin mutation before reading JSON or calling the service", async () => {
    const response = await mutateUser(
      mutationRequest({ action: "set_active", active: false }, {
        origin: "https://evil.example.test",
      }),
      mutationContext(),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "INVALID_ORIGIN" })
    expect(mocks.setAdminUserActive).not.toHaveBeenCalled()
  })

  it("rejects a JSON near-match media type", async () => {
    const response = await mutateUser(
      mutationRequest({ action: "set_active", active: false }, {
        "content-type": "application/json-patch+json",
      }),
      mutationContext(),
    )

    expect(response.status).toBe(415)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE" })
    expect(mocks.setAdminUserActive).not.toHaveBeenCalled()
  })

  it("accepts legal JSON content-type parameters", async () => {
    const response = await mutateUser(
      mutationRequest({ action: "set_active", active: false }, {
        "content-type": "application/json; charset=utf-8",
      }),
      mutationContext(),
    )

    expect(response.status).toBe(200)
    expect(mocks.setAdminUserActive).toHaveBeenCalledOnce()
  })

  it("rejects a streamed mutation that exceeds the byte limit", async () => {
    const response = await mutateUser(
      mutationRequest(JSON.stringify({
        action: "reset_password",
        password: "x".repeat(64 * 1_024),
      })),
      mutationContext(),
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "REQUEST_TOO_LARGE" })
    expect(mocks.resetAdminUserPassword).not.toHaveBeenCalled()
  })

  it("rejects invalid JSON before dispatching an action", async () => {
    const response = await mutateUser(mutationRequest("{"), mutationContext())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "INVALID_JSON" })
    expect(mocks.changeAdminUserRole).not.toHaveBeenCalled()
    expect(mocks.setAdminUserActive).not.toHaveBeenCalled()
    expect(mocks.resetAdminUserPassword).not.toHaveBeenCalled()
  })

  it.each([
    ["unsupported action", { action: "delete_user" }],
    ["missing action", {}],
    ["null body", null],
    ["array body", []],
    ["primitive body", 42],
  ])("rejects an invalid action envelope with %s", async (_, body) => {
    const response = await mutateUser(mutationRequest(body), mutationContext())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "INVALID_USER_ACTION" })
    expect(mocks.changeAdminUserRole).not.toHaveBeenCalled()
    expect(mocks.setAdminUserActive).not.toHaveBeenCalled()
    expect(mocks.resetAdminUserPassword).not.toHaveBeenCalled()
  })

  it("dispatches a role change with the authenticated actor and target", async () => {
    const response = await mutateUser(
      mutationRequest({ action: "change_role", role: "SALES" }),
      mutationContext(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      user: { ...user, role: "SALES" },
    })
    expect(mocks.changeAdminUserRole).toHaveBeenCalledWith({
      actorId,
      targetUserId: targetId,
      role: "SALES",
    })
  })

  it("dispatches an active-state change with the authenticated actor and target", async () => {
    const response = await mutateUser(
      mutationRequest({ action: "set_active", active: false }),
      mutationContext(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      user: { ...user, active: false },
    })
    expect(mocks.setAdminUserActive).toHaveBeenCalledWith({
      actorId,
      targetUserId: targetId,
      active: false,
    })
  })

  it("dispatches a password reset without returning password data", async () => {
    const response = await mutateUser(
      mutationRequest({ action: "reset_password", password: "StrongPassword!123" }),
      mutationContext(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(mocks.resetAdminUserPassword).toHaveBeenCalledWith({
      actorId,
      targetUserId: targetId,
      password: "StrongPassword!123",
    })
  })

  it.each([
    ["invalid UUID", "INVALID_ENTITY_ID", 400],
    ["invalid role", "INVALID_USER_ROLE", 400],
    ["invalid active state", "INVALID_ACTIVE_STATE", 400],
    ["invalid password", "INVALID_PASSWORD", 400],
  ])("maps %s service errors to a stable 400 response", async (_, code, status) => {
    const error = new AdminServiceError(code)
    mocks.changeAdminUserRole.mockRejectedValueOnce(error)

    const response = await mutateUser(
      mutationRequest({ action: "change_role", role: "SALES" }),
      mutationContext(),
    )

    expect(response.status).toBe(status)
    await expect(response.json()).resolves.toEqual({ ok: false, code })
  })

  it("passes invalid target UUID errors through the selected service mapping", async () => {
    mocks.setAdminUserActive.mockRejectedValueOnce(new AdminServiceError("INVALID_ENTITY_ID"))

    const response = await mutateUser(
      mutationRequest({ action: "set_active", active: false }),
      mutationContext("not-a-uuid"),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "INVALID_ENTITY_ID" })
  })

  it.each(["ADMIN_USER_NOT_FOUND", "ACTOR_NOT_FOUND"])(
    "maps %s to 404",
    async (code) => {
      mocks.setAdminUserActive.mockRejectedValueOnce(new AdminServiceError(code))

      const response = await mutateUser(
        mutationRequest({ action: "set_active", active: false }),
        mutationContext(),
      )

      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toEqual({ ok: false, code })
    },
  )

  it.each([
    "ACTOR_NOT_AUTHORIZED",
    "SELF_DEACTIVATION_FORBIDDEN",
    "SELF_DEMOTION_FORBIDDEN",
    "LAST_ACTIVE_ADMIN",
  ])("maps %s to a 409 conflict", async (code) => {
    mocks.setAdminUserActive.mockRejectedValueOnce(new AdminServiceError(code))

    const response = await mutateUser(
      mutationRequest({ action: "set_active", active: false }),
      mutationContext(),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ ok: false, code })
  })

  it.each(["UNRECOGNIZED_ERROR", "constructor", "toString"])(
    "hides unknown typed service error %s behind a generic 503",
    async (code) => {
      mocks.setAdminUserActive.mockRejectedValueOnce(new AdminServiceError(code))

      const response = await mutateUser(
        mutationRequest({ action: "set_active", active: false }),
        mutationContext(),
      )

      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({
        ok: false,
        code: "USER_MUTATION_UNAVAILABLE",
      })
    },
  )

  it("hides unexpected service failures behind a generic 503", async () => {
    mocks.resetAdminUserPassword.mockRejectedValueOnce(new Error("database password leaked"))

    const response = await mutateUser(
      mutationRequest({ action: "reset_password", password: "StrongPassword!123" }),
      mutationContext(),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "USER_MUTATION_UNAVAILABLE",
    })
  })
})
