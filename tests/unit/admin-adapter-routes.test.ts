// @vitest-environment node

import type { UserRole } from "@prisma/client"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createObjectStorage: vi.fn(),
  createPresignedUpload: vi.fn(),
  createConfiguredTranslationProvider: vi.fn(),
  translateEnglishToArabic: vi.fn(),
  completeAndAttachProductImage: vi.fn(),
  storage: {},
  provider: { name: "fake", translate: vi.fn() },
}))

vi.mock("@/modules/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/auth/session")>()),
  requireSession: mocks.requireSession,
}))

vi.mock("@/modules/media/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/media/storage")>()),
  createObjectStorage: mocks.createObjectStorage,
}))

vi.mock("@/modules/media/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/media/service")>()),
  createPresignedUpload: mocks.createPresignedUpload,
}))

vi.mock("@/modules/translation/provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/translation/provider")>()),
  createConfiguredTranslationProvider: mocks.createConfiguredTranslationProvider,
}))

vi.mock("@/modules/translation/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/translation/service")>()),
  translateEnglishToArabic: mocks.translateEnglishToArabic,
}))

vi.mock("@/modules/admin/media-service", () => ({
  completeAndAttachProductImage: mocks.completeAndAttachProductImage,
}))

import { POST as completeMedia } from "@/app/api/admin/media/complete/route"
import { POST as presign } from "@/app/api/admin/media/presign/route"
import { POST as translate } from "@/app/api/admin/translation/route"
import { AuthenticationError } from "@/modules/auth/session"

function adminSession(role: UserRole = "EDITOR") {
  return {
    sessionId: "session-id",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    user: {
      id: "user-id",
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
  mocks.createObjectStorage.mockReturnValue(mocks.storage)
  mocks.createConfiguredTranslationProvider.mockReturnValue(mocks.provider)
  mocks.createPresignedUpload.mockResolvedValue({
    key: "staging/media/00000000-0000-4000-8000-000000000000",
    uploadUrl: "https://storage.example.test/uploads",
    fields: { key: "controlled-key" },
    expiresAt: "2026-08-13T12:00:00.000Z",
  })
  mocks.translateEnglishToArabic.mockResolvedValue({
    success: true,
    text: "مسودة Minimum order 1,000 pieces",
    provider: "fake",
  })
  mocks.completeAndAttachProductImage.mockResolvedValue({
    id: "media-id",
    productId: "00000000-0000-4000-8000-000000000001",
    url: "https://media.example.test/assets/primary.webp",
  })
})

describe("authenticated admin adapter routes", () => {
  it.each([
    ["media presign", presign, "/api/admin/media/presign"],
    ["media completion", completeMedia, "/api/admin/media/complete"],
    ["translation", translate, "/api/admin/translation"],
  ])("rejects unauthenticated %s requests before reading the body or loading adapters", async (_, handler, path) => {
    mocks.requireSession.mockRejectedValueOnce(new AuthenticationError())

    const response = await handler(jsonRequest(path, "{"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "UNAUTHORIZED",
    })
    expect(mocks.createObjectStorage).not.toHaveBeenCalled()
    expect(mocks.createConfiguredTranslationProvider).not.toHaveBeenCalled()
    expect(mocks.createPresignedUpload).not.toHaveBeenCalled()
    expect(mocks.completeAndAttachProductImage).not.toHaveBeenCalled()
    expect(mocks.translateEnglishToArabic).not.toHaveBeenCalled()
  })

  it.each([
    ["media presign", presign, "/api/admin/media/presign"],
    ["media completion", completeMedia, "/api/admin/media/complete"],
    ["translation", translate, "/api/admin/translation"],
  ])("rejects SALES access to the %s adapter before loading it", async (_, handler, path) => {
    mocks.requireSession.mockResolvedValueOnce(adminSession("SALES"))

    const response = await handler(jsonRequest(path, {}))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "FORBIDDEN",
    })
    expect(mocks.createObjectStorage).not.toHaveBeenCalled()
    expect(mocks.createConfiguredTranslationProvider).not.toHaveBeenCalled()
    expect(mocks.completeAndAttachProductImage).not.toHaveBeenCalled()
  })

  it.each([
    ["media presign", presign, "/api/admin/media/presign"],
    ["media completion", completeMedia, "/api/admin/media/complete"],
    ["translation", translate, "/api/admin/translation"],
  ])("rejects cross-origin %s requests before loading adapters", async (_, handler, path) => {
    const response = await handler(jsonRequest(path, {}, {
      origin: "https://evil.example.test",
    }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_ORIGIN",
    })
    expect(mocks.createObjectStorage).not.toHaveBeenCalled()
    expect(mocks.createConfiguredTranslationProvider).not.toHaveBeenCalled()
    expect(mocks.completeAndAttachProductImage).not.toHaveBeenCalled()
  })

  it("creates a controlled presigned upload for an editor", async () => {
    const declaration = {
      fileName: "warehouse-proof.png",
      contentType: "image/png",
      size: 1_024,
    }

    const response = await presign(jsonRequest(
      "/api/admin/media/presign",
      declaration,
    ))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      upload: {
        key: "staging/media/00000000-0000-4000-8000-000000000000",
        uploadUrl: "https://storage.example.test/uploads",
        fields: { key: "controlled-key" },
        expiresAt: "2026-08-13T12:00:00.000Z",
      },
    })
    expect(mocks.createObjectStorage).toHaveBeenCalledOnce()
    expect(mocks.createPresignedUpload).toHaveBeenCalledWith({
      declaration,
      storage: mocks.storage,
    })
  })

  it("rejects malformed media declarations before loading storage", async () => {
    const response = await presign(jsonRequest(
      "/api/admin/media/presign",
      { fileName: "proof.png", contentType: "image/png", size: "1024" },
    ))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_DECLARATION",
    })
    expect(mocks.createObjectStorage).not.toHaveBeenCalled()
  })

  it("completes and attaches controlled product media for an editor", async () => {
    const input = {
      productId: "00000000-0000-4000-8000-000000000001",
      key: "staging/media/00000000-0000-4000-8000-000000000000",
      declaration: {
        fileName: "warehouse-proof.png",
        contentType: "image/png",
        size: 1_024,
      },
      altText: "Warehouse inspection proof",
      sortOrder: 0,
      isPrimary: true,
      publicUrl: "https://evil.example.test/injected.webp",
      variants: { primary: { width: 1 } },
    }

    const response = await completeMedia(jsonRequest(
      "/api/admin/media/complete",
      input,
    ))

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      media: {
        id: "media-id",
        productId: input.productId,
        url: "https://media.example.test/assets/primary.webp",
      },
    })
    expect(mocks.createObjectStorage).toHaveBeenCalledOnce()
    expect(mocks.completeAndAttachProductImage).toHaveBeenCalledWith({
      productId: input.productId,
      key: input.key,
      declaration: input.declaration,
      altText: input.altText,
      sortOrder: 0,
      isPrimary: true,
      actorId: "user-id",
      storage: mocks.storage,
    })
  })

  it("rejects malformed media completion before loading storage", async () => {
    const response = await completeMedia(jsonRequest(
      "/api/admin/media/complete",
      {
        productId: "not-a-product-id",
        key: "public/media/injected/primary.webp",
        declaration: {
          fileName: "proof.png",
          contentType: "image/png",
          size: 1_024,
        },
        altText: null,
        sortOrder: 0,
        isPrimary: true,
      },
    ))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_MEDIA_COMPLETION",
    })
    expect(mocks.createObjectStorage).not.toHaveBeenCalled()
    expect(mocks.completeAndAttachProductImage).not.toHaveBeenCalled()
  })

  it("generates an Arabic draft for an editor without persisting or publishing it", async () => {
    const input = {
      text: "Minimum order 1,000 pieces",
      protectedTerms: ["1,000"],
    }

    const response = await translate(jsonRequest(
      "/api/admin/translation",
      input,
    ))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      draft: {
        text: "مسودة Minimum order 1,000 pieces",
        provider: "fake",
      },
    })
    expect(mocks.createConfiguredTranslationProvider).toHaveBeenCalledOnce()
    expect(mocks.translateEnglishToArabic).toHaveBeenCalledWith({
      ...input,
      provider: mocks.provider,
    })
  })

  it("rejects malformed translation inputs before loading the provider", async () => {
    const response = await translate(jsonRequest(
      "/api/admin/translation",
      { text: "", protectedTerms: [42] },
    ))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_TRANSLATION_INPUT",
    })
    expect(mocks.createConfiguredTranslationProvider).not.toHaveBeenCalled()
    expect(mocks.completeAndAttachProductImage).not.toHaveBeenCalled()
  })
})
