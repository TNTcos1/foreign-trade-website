import { randomUUID } from "node:crypto"

import { expect, test, type Page } from "@playwright/test"

import {
  createTemporaryLoginUser,
  installSeedAdminSession,
  removeTemporaryLoginUser,
} from "./admin-session-fixture"
const adminEmail = "admin@clearance.local.invalid"
const editorEmail = "editor@clearance.local.invalid"
const salesEmail = "sales@clearance.local.invalid"
const productId = "00000000-0000-4000-8000-000000000001"

type SeedRole = "ADMIN" | "EDITOR" | "SALES"

type BrowserDiagnostics = {
  consoleErrors: string[]
  failedRequests: string[]
  allowedConsoleErrors: string[]
}

function isAdminApplicationRequest(url: string): boolean {
  const pathname = new URL(url).pathname
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/")
}

test.describe("admin authentication and staff access", () => {
  const diagnosticsByPage = new WeakMap<Page, BrowserDiagnostics>()

  test.beforeEach(async ({ page }) => {
    const diagnostics: BrowserDiagnostics = { consoleErrors: [], failedRequests: [], allowedConsoleErrors: [] }
    diagnosticsByPage.set(page, diagnostics)
    page.on("console", (message) => {
      if (message.type() !== "error") return
      const location = message.location().url
      diagnostics.consoleErrors.push(location ? `${message.text()} — ${location}` : message.text())
    })
    page.on("requestfailed", (request) => {
      if (!isAdminApplicationRequest(request.url()) || request.failure()?.errorText === "net::ERR_ABORTED") return
      diagnostics.failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "request failed"}`)
    })
    page.on("response", (response) => {
      if (response.status() < 500 || !isAdminApplicationRequest(response.url())) return
      diagnostics.failedRequests.push(`${response.request().method()} ${response.url()} — HTTP ${response.status()}`)
    })
  })

  async function signInWithCredentials(page: Page, email: string, password: string) {
    await page.goto("/admin/login")
    await page.getByLabel("Work email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Enter control room" }).click()
    await expect(page).toHaveURL(/\/admin$/)
  }

  async function signInAsSeedUser(page: Page, email: string) {
    await installSeedAdminSession(page, email)
    await expect(page).toHaveURL(/\/admin$/)
  }

  async function signOut(page: Page) {
    const response = await page.request.post("/api/admin/auth/logout", {
      headers: { origin: new URL(page.url()).origin },
    })
    expect(response.ok()).toBe(true)
  }

  test.afterEach(async ({ page }, testInfo) => {
    let cleanupError: unknown
    try {
      await signOut(page)
    } catch (error) {
      cleanupError = error
    }

    const diagnostics = diagnosticsByPage.get(page)
    const originalTestFailed = testInfo.errors.length > 0 || testInfo.status !== testInfo.expectedStatus
    if (cleanupError) {
      if (!originalTestFailed) throw cleanupError
      await testInfo.attach("session-cleanup-error", {
        body: cleanupError instanceof Error ? cleanupError.stack ?? cleanupError.message : String(cleanupError),
        contentType: "text/plain",
      })
    }
    if (diagnostics && (diagnostics.consoleErrors.length || diagnostics.failedRequests.length)) {
      const body = JSON.stringify(diagnostics, null, 2)
      if (!originalTestFailed && !cleanupError) {
        expect(diagnostics.consoleErrors.filter((message) => !diagnostics.allowedConsoleErrors.includes(message)), "Unexpected browser console errors").toEqual([])
        expect(diagnostics.failedRequests, "Unexpected failed admin application requests").toEqual([])
      } else {
        await testInfo.attach("admin-browser-diagnostics", { body, contentType: "application/json" })
      }
    }
  })

  type SeedUser = {
    id: string
    email: string
    role: SeedRole
    active: boolean
  }

  async function listUsers(page: Page): Promise<SeedUser[]> {
    const response = await page.request.get("/api/admin/users")
    expect(response.ok()).toBe(true)
    const body = await response.json() as { ok: boolean; users: SeedUser[] }
    expect(body.ok).toBe(true)
    return body.users
  }

  async function postUserAction(page: Page, userId: string, data: unknown) {
    return page.request.post(`/api/admin/users/${userId}`, {
      headers: {
        "content-type": "application/json",
        origin: new URL(page.url()).origin,
      },
      data,
    })
  }

  async function readRole(page: Page, userId: string): Promise<SeedRole> {
    const users = await listUsers(page)
    const user = users.find(({ id }) => id === userId)
    if (!user) throw new Error(`Seed user ${userId} was not returned by the staff API.`)
    return user.role
  }

  async function restoreRole(page: Page, userId: string, role: SeedRole) {
    const response = await postUserAction(page, userId, { action: "change_role", role })
    expect(response.ok()).toBe(true)
    await expect.poll(() => readRole(page, userId)).toBe(role)
  }

  test("redirects unauthenticated /admin access and rejects invalid credentials generically", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/admin\/login$/)
    await expect(page.getByRole("heading", { name: "Control room sign in" })).toBeVisible()

    await page.getByLabel("Work email").fill(`missing-${randomUUID()}@clearance.local.invalid`)
    await page.getByLabel("Password").fill(`Invalid-${randomUUID()}!`)
    const loginUrl = new URL("/api/admin/auth/login", page.url()).href
    diagnosticsByPage.get(page)?.allowedConsoleErrors.push(
      `Failed to load resource: the server responded with a status of 401 (Unauthorized) — ${loginUrl}`,
    )
    const loginResponse = page.waitForResponse(
      (response) => response.url() === loginUrl && response.request().method() === "POST",
      { timeout: 30_000 },
    )
    await page.getByRole("button", { name: "Enter control room" }).click()
    expect((await loginResponse).status()).toBe(401)

    await expect(page.locator(".admin-login-form .admin-alert")).toHaveText("The email or password was not accepted.")
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test("valid login establishes a session and logout invalidates it", async ({ page }) => {
    const fixture = await createTemporaryLoginUser()
    try {
      await signInWithCredentials(page, fixture.email, fixture.password)
      await page.getByRole("button", { name: "Sign out" }).click()
      await expect(page).toHaveURL(/\/admin\/login$/)

      await page.goto("/admin")
      await expect(page).toHaveURL(/\/admin\/login$/)
    } finally {
      await removeTemporaryLoginUser(fixture.id)
    }
  })

  test("ADMIN can review staff controls without exposing authentication records", async ({ page }) => {
    let editorId = ""
    let originalRole: SeedRole | null = null

    try {
      await signInAsSeedUser(page, adminEmail)
      await expect(page.getByRole("link", { name: "Staff access" })).toBeVisible()
      await page.goto("/admin/users")

      await expect(page.getByRole("heading", { level: 1, name: "Keep the right hands on the ledger." })).toBeVisible()
      await expect(page.getByRole("row", { name: /Development Admin/ })).toBeVisible()
      await expect(page.getByRole("row", { name: /Development Editor/ })).toBeVisible()
      await expect(page.getByRole("row", { name: /Development Sales/ })).toBeVisible()
      await expect(page.locator("body")).not.toContainText(/passwordHash|session|tokenHash|audit metadata/i)

      const ownRow = page.getByRole("row", { name: /Development Admin/ })
      await expect(ownRow.getByRole("combobox")).toBeDisabled()
      await expect(ownRow.getByRole("button", { name: "Deactivate" })).toBeDisabled()

      const users = await listUsers(page)
      const editor = users.find(({ email }) => email === editorEmail)
      if (!editor) throw new Error("Development Editor was not returned by the staff API.")
      editorId = editor.id
      originalRole = editor.role
      const changedRole: SeedRole = originalRole === "SALES" ? "EDITOR" : "SALES"
      const editorRow = page.getByRole("row", { name: /Development Editor/ })

      await editorRow.getByRole("combobox").selectOption(changedRole)
      await expect.poll(() => readRole(page, editorId)).toBe(changedRole)
      await expect(editorRow).toContainText(`Development Editor's role is now ${changedRole === "SALES" ? "Sales" : "Editor"}.`)

      await editorRow.getByRole("combobox").selectOption(originalRole)
      await expect.poll(() => readRole(page, editorId)).toBe(originalRole)
      await expect(editorRow).toContainText(`Development Editor's role is now ${originalRole === "SALES" ? "Sales" : originalRole === "ADMIN" ? "Admin" : "Editor"}.`)
    } finally {
      if (editorId && originalRole) {
        await restoreRole(page, editorId, originalRole)
      }
    }
  })

  test("ADMIN cannot remove the last active admin or lock their own account", async ({ page }) => {
    let adminId = ""
    let editorId = ""
    let originalEditorRole: SeedRole | null = null

    try {
      await signInAsSeedUser(page, adminEmail)
      const users = await listUsers(page)
      const admin = users.find(({ email }) => email === adminEmail)
      const editor = users.find(({ email }) => email === editorEmail)
      if (!admin || !editor) throw new Error("Required development staff users were not returned by the staff API.")
      adminId = admin.id
      editorId = editor.id
      originalEditorRole = editor.role

      const activeAdminCount = users.filter(({ role, active }) => role === "ADMIN" && active).length
      const lastAdminResponse = await postUserAction(page, admin.id, {
        action: "change_role",
        role: "EDITOR",
      })
      expect(lastAdminResponse.status()).toBe(409)
      await expect(lastAdminResponse.json()).resolves.toEqual({
        ok: false,
        code: activeAdminCount === 1 ? "LAST_ACTIVE_ADMIN" : "SELF_DEMOTION_FORBIDDEN",
      })

      const promoteEditorResponse = await postUserAction(page, editor.id, {
        action: "change_role",
        role: "ADMIN",
      })
      expect(promoteEditorResponse.ok()).toBe(true)
      await expect.poll(() => readRole(page, editor.id)).toBe("ADMIN")

      const selfDemotionResponse = await postUserAction(page, admin.id, {
        action: "change_role",
        role: "EDITOR",
      })
      expect(selfDemotionResponse.status()).toBe(409)
      await expect(selfDemotionResponse.json()).resolves.toEqual({ ok: false, code: "SELF_DEMOTION_FORBIDDEN" })

      const selfDeactivationResponse = await postUserAction(page, admin.id, {
        action: "set_active",
        active: false,
      })
      expect(selfDeactivationResponse.status()).toBe(409)
      await expect(selfDeactivationResponse.json()).resolves.toEqual({ ok: false, code: "SELF_DEACTIVATION_FORBIDDEN" })
    } finally {
      if (editorId && originalEditorRole) {
        await restoreRole(page, editorId, originalEditorRole)
      }
      if (adminId) {
        await expect.poll(() => readRole(page, adminId)).toBe("ADMIN")
      }
    }
  })

  test("ADMIN receives exact-match password feedback without submitting a mismatched secret", async ({ page }) => {
    await signInAsSeedUser(page, adminEmail)
    await page.goto("/admin/users")

    const editorRow = page.getByRole("row", { name: /Development Editor/ })
    await editorRow.getByText("Reset password", { exact: true }).click()
    const candidatePassword = `Candidate-${randomUUID()}!`
    await editorRow.getByLabel("New password", { exact: true }).fill(candidatePassword)
    await editorRow.getByLabel("Confirm new password").fill(`Mismatch-${randomUUID()}!`)
    await editorRow.getByRole("button", { name: "Set new password" }).click()

    await expect(editorRow.getByRole("alert")).toHaveText("The new password fields must match exactly.")
  })

  test("EDITOR can open product and content management but not staff management", async ({ page }) => {
    await signInAsSeedUser(page, editorEmail)
    await expect(page.getByRole("link", { name: "Product ledger", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Content desk", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Staff access" })).toHaveCount(0)

    await page.goto("/admin/products")
    await expect(page.getByRole("heading", { level: 1, name: "Facts that can ship." })).toBeVisible()
    await page.goto("/admin/content")
    await expect(page.getByRole("heading", { level: 1, name: "Proof needs the right words." })).toBeVisible()
    await page.goto("/admin/users")
    await expect(page).toHaveURL(/\/admin$/)

    const staffResponse = await page.request.get("/api/admin/users")
    expect(staffResponse.status()).toBe(403)
    await expect(staffResponse.json()).resolves.toEqual({ ok: false, code: "FORBIDDEN" })
  })

  test("SALES is denied product, content, media, translation, and staff writes", async ({ page }) => {
    await signInAsSeedUser(page, salesEmail)
    await expect(page.getByRole("link", { name: "Product ledger", exact: true })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Content desk", exact: true })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Staff access" })).toHaveCount(0)

    await page.goto("/admin/products")
    await expect(page).toHaveURL(/\/admin$/)
    await page.goto("/admin/content")
    await expect(page).toHaveURL(/\/admin$/)

    const requests = [
      ["product", `/api/admin/products/${productId}`],
      ["content", "/api/admin/content/markets/yemen"],
      ["media", "/api/admin/media/presign"],
      ["translation", "/api/admin/translation"],
      ["staff", "/api/admin/users/00000000-0000-4000-8000-000000000002"],
    ] as const
    const denied: Array<{ name: string; status: number; body: unknown }> = []
    for (const [name, url] of requests) {
      const response = await page.request.post(url, {
        headers: {
          "content-type": "application/json",
          origin: new URL(page.url()).origin,
        },
        data: { action: "publish_locale", locale: "en" },
      })
      denied.push({ name, status: response.status(), body: await response.json() })
    }

    expect(denied).toEqual([
      { name: "product", status: 403, body: { ok: false, code: "FORBIDDEN" } },
      { name: "content", status: 403, body: { ok: false, code: "FORBIDDEN" } },
      { name: "media", status: 403, body: { ok: false, code: "FORBIDDEN" } },
      { name: "translation", status: 403, body: { ok: false, code: "FORBIDDEN" } },
      { name: "staff", status: 403, body: { ok: false, code: "FORBIDDEN" } },
    ])
  })
})
