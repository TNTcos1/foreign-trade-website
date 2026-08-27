// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { POST as login } from "@/app/api/admin/auth/login/route"
import { POST as logout } from "@/app/api/admin/auth/logout/route"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/modules/auth/password"
import { ADMIN_SESSION_COOKIE, readAdminSession } from "@/modules/auth/session"

const email = `login-${Date.now()}@example.test`
const password = "integration route password"
let adminUserId: string
const originalAuthSecret = process.env.AUTH_SECRET

function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`https://admin.example.test${path}`, {
    method: "POST",
    headers: {
      origin: "https://admin.example.test",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

beforeAll(async () => {
  process.env.AUTH_SECRET = "test-only-admin-auth-secret-at-least-32-characters"
  const user = await prisma.adminUser.create({
    data: {
      email,
      name: "Route Test Editor",
      passwordHash: await hashPassword(password),
      role: "EDITOR",
    },
  })
  adminUserId = user.id
})

afterAll(async () => {
  await prisma.adminUser.delete({ where: { id: adminUserId } })
  if (originalAuthSecret === undefined) {
    delete process.env.AUTH_SECRET
  } else {
    process.env.AUTH_SECRET = originalAuthSecret
  }
  await prisma.$disconnect()
})

describe("admin authentication routes", () => {
  it("creates a secure database session cookie for valid credentials", async () => {
    const response = await login(jsonRequest("/api/admin/auth/login", { email, password }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      user: { email, role: "EDITOR" },
      redirectUrl: "/admin",
    })
    const setCookie = response.headers.get("set-cookie") ?? ""
    expect(setCookie).toContain(`${ADMIN_SESSION_COOKIE}=`)
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie).toContain("SameSite=lax")
    expect(setCookie).toContain("Path=/")
    expect(setCookie).not.toContain("Secure")

    const token = response.cookies.get(ADMIN_SESSION_COOKIE)?.value
    await expect(readAdminSession(token!)).resolves.toMatchObject({
      user: { id: adminUserId, role: "EDITOR" },
    })
  })

  it("uses one credential error for missing, wrong, and inactive accounts", async () => {
    const attempts = [
      { email: "missing@example.test", password },
      { email, password: "wrong password" },
    ]
    for (const body of attempts) {
      const response = await login(jsonRequest("/api/admin/auth/login", body, {
        "x-forwarded-for": `198.51.100.${attempts.indexOf(body) + 1}`,
      }))
      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toEqual({ ok: false, code: "INVALID_CREDENTIALS" })
    }

    await prisma.adminUser.update({ where: { id: adminUserId }, data: { active: false } })
    const inactive = await login(jsonRequest("/api/admin/auth/login", { email, password }, {
      "x-forwarded-for": "198.51.100.20",
    }))
    expect(inactive.status).toBe(401)
    await expect(inactive.json()).resolves.toEqual({ ok: false, code: "INVALID_CREDENTIALS" })
    await prisma.adminUser.update({ where: { id: adminUserId }, data: { active: true } })
  })

  it("rejects cross-origin requests and revokes the current session on logout", async () => {
    const crossOrigin = jsonRequest("/api/admin/auth/login", { email, password }, {
      origin: "https://evil.example.test",
    })
    const rejected = await login(crossOrigin)
    expect(rejected.status).toBe(403)

    const loggedIn = await login(jsonRequest("/api/admin/auth/login", { email, password }, {
      "x-forwarded-for": "198.51.100.30",
    }))
    const token = loggedIn.cookies.get(ADMIN_SESSION_COOKIE)!.value
    const request = new NextRequest("https://admin.example.test/api/admin/auth/logout", {
      method: "POST",
      headers: {
        origin: "https://admin.example.test",
        cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
      },
    })
    const response = await logout(request)

    expect(response.status).toBe(200)
    await expect(readAdminSession(token)).resolves.toBeNull()
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
  })
})
