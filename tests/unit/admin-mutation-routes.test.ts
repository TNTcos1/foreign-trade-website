// @vitest-environment node

import type { UserRole } from "@prisma/client"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createProductDraft: vi.fn(),
  saveProductTranslation: vi.fn(),
  publishProductLocale: vi.fn(),
  unpublishProductLocale: vi.fn(),
  markProductSoldOut: vi.fn(),
  duplicateProduct: vi.fn(),
  archiveProduct: vi.fn(),
  restoreProduct: vi.fn(),
  updateProductDraft: vi.fn(),
  saveContentTranslation: vi.fn(),
  publishContentLocale: vi.fn(),
  unpublishContentLocale: vi.fn(),
}))

vi.mock("@/modules/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/auth/session")>()),
  requireSession: mocks.requireSession,
}))

vi.mock("@/modules/admin/product-service", () => ({
  createProductDraft: mocks.createProductDraft,
  saveProductTranslation: mocks.saveProductTranslation,
  publishProductLocale: mocks.publishProductLocale,
  unpublishProductLocale: mocks.unpublishProductLocale,
  markProductSoldOut: mocks.markProductSoldOut,
  duplicateProduct: mocks.duplicateProduct,
  archiveProduct: mocks.archiveProduct,
  restoreProduct: mocks.restoreProduct,
  updateProductDraft: mocks.updateProductDraft,
}))

vi.mock("@/modules/admin/content-service", () => ({
  saveContentTranslation: mocks.saveContentTranslation,
  publishContentLocale: mocks.publishContentLocale,
  unpublishContentLocale: mocks.unpublishContentLocale,
}))

import { POST as createProduct } from "@/app/api/admin/products/route"
import { POST as mutateProduct } from "@/app/api/admin/products/[id]/route"
import { POST as mutateContent } from "@/app/api/admin/content/[...slug]/route"
import { AuthenticationError } from "@/modules/auth/session"

const productId = "00000000-0000-4000-8000-000000000001"

function adminSession(role: UserRole = "EDITOR") {
  return {
    sessionId: "session-id",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    user: {
      id: "00000000-0000-4000-8000-000000000002",
      email: "editor@example.test",
      name: "Editor",
      role,
    },
  }
}

function jsonRequest(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new NextRequest(`https://admin.example.test${path}`, {
    method: "POST",
    headers: {
      origin: "https://admin.example.test",
      "content-type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireSession.mockResolvedValue(adminSession())
  mocks.createProductDraft.mockResolvedValue({ id: productId, code: "LOT-1" })
  mocks.publishProductLocale.mockResolvedValue({ id: "translation-id" })
  mocks.updateProductDraft.mockResolvedValue({ id: productId, category: "Updated" })
  mocks.saveContentTranslation.mockResolvedValue({ id: "content-translation-id" })
})

describe("admin mutation routes", () => {
  it.each([
    ["create product", createProduct, "/api/admin/products"],
    ["mutate product", (request: NextRequest) => mutateProduct(request, {
      params: Promise.resolve({ id: productId }),
    }), `/api/admin/products/${productId}`],
    ["mutate content", (request: NextRequest) => mutateContent(request, {
      params: Promise.resolve({ slug: ["markets", "yemen"] }),
    }), "/api/admin/content/markets/yemen"],
  ])("rejects unauthenticated %s before reading malformed JSON", async (_, handler, path) => {
    mocks.requireSession.mockRejectedValueOnce(new AuthenticationError())

    const response = await handler(jsonRequest(path, "{"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "UNAUTHORIZED" })
    expect(mocks.createProductDraft).not.toHaveBeenCalled()
    expect(mocks.publishProductLocale).not.toHaveBeenCalled()
    expect(mocks.saveContentTranslation).not.toHaveBeenCalled()
  })

  it.each([
    ["product", (request: NextRequest) => mutateProduct(request, {
      params: Promise.resolve({ id: productId }),
    }), `/api/admin/products/${productId}`],
    ["content", (request: NextRequest) => mutateContent(request, {
      params: Promise.resolve({ slug: ["why-us"] }),
    }), "/api/admin/content/why-us"],
  ])("rejects SALES %s mutations", async (_, handler, path) => {
    mocks.requireSession.mockResolvedValueOnce(adminSession("SALES"))

    const response = await handler(jsonRequest(path, { action: "publish_locale", locale: "en" }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "FORBIDDEN" })
    expect(mocks.publishProductLocale).not.toHaveBeenCalled()
    expect(mocks.publishContentLocale).not.toHaveBeenCalled()
  })

  it("rejects cross-origin product creation before calling the service", async () => {
    const response = await createProduct(jsonRequest(
      "/api/admin/products",
      {},
      { origin: "https://evil.example.test" },
    ))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ ok: false, code: "INVALID_ORIGIN" })
    expect(mocks.createProductDraft).not.toHaveBeenCalled()
  })

  it("creates a product draft with the authenticated actor", async () => {
    const input = { code: "LOT-1", type: "STOCK_LOT" }

    const response = await createProduct(jsonRequest("/api/admin/products", input))

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      product: { id: productId, code: "LOT-1" },
    })
    expect(mocks.createProductDraft).toHaveBeenCalledWith(
      input,
      "00000000-0000-4000-8000-000000000002",
    )
  })

  it("dispatches a product locale publication action", async () => {
    const response = await mutateProduct(
      jsonRequest(`/api/admin/products/${productId}`, {
        action: "publish_locale",
        locale: "ar",
      }),
      { params: Promise.resolve({ id: productId }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.publishProductLocale).toHaveBeenCalledWith(
      productId,
      "ar",
      "00000000-0000-4000-8000-000000000002",
    )
  })

  it("dispatches a product business-field update with the authenticated actor", async () => {
    const product = { type: "STOCK_LOT", status: "READY_STOCK" }
    const response = await mutateProduct(
      jsonRequest(`/api/admin/products/${productId}`, {
        action: "update",
        product,
      }),
      { params: Promise.resolve({ id: productId }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.updateProductDraft).toHaveBeenCalledWith(
      productId,
      product,
      "00000000-0000-4000-8000-000000000002",
    )
  })

  it("joins catch-all content slugs before saving a translation", async () => {
    const translation = { title: "Yemen", body: "Draft" }
    const response = await mutateContent(
      jsonRequest("/api/admin/content/markets/yemen", {
        action: "save_translation",
        locale: "en",
        translation,
      }),
      { params: Promise.resolve({ slug: ["markets", "yemen"] }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.saveContentTranslation).toHaveBeenCalledWith(
      "markets/yemen",
      "en",
      translation,
      "00000000-0000-4000-8000-000000000002",
    )
  })

  it("rejects unknown actions without invoking mutation services", async () => {
    const response = await mutateProduct(
      jsonRequest(`/api/admin/products/${productId}`, { action: "unknown" }),
      { params: Promise.resolve({ id: productId }) },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_PRODUCT_ACTION",
    })
    expect(mocks.publishProductLocale).not.toHaveBeenCalled()
    expect(mocks.archiveProduct).not.toHaveBeenCalled()
  })
})
