// @vitest-environment node

import sharp from "sharp"
import { describe, expect, it, vi } from "vitest"

import {
  completeUploadedImage,
  createPresignedUpload,
} from "@/modules/media/service"
import type {
  ObjectStorage,
  PresignedPost,
  StoredObject,
} from "@/modules/media/storage"
import type { TranslationProvider } from "@/modules/translation/provider"
import { translateEnglishToArabic } from "@/modules/translation/service"

class MemoryStorage implements ObjectStorage {
  readonly deleted: string[] = []
  readonly objects = new Map<string, StoredObject>()
  readonly posts: Array<{ key: string; contentType: string; maxBytes: number }> = []
  failAfterPut = false

  async createPresignedPost(input: {
    key: string
    contentType: string
    maxBytes: number
    expiresInSeconds: number
  }): Promise<PresignedPost> {
    this.posts.push(input)
    return {
      uploadUrl: "https://storage.example.test/bucket",
      fields: { key: input.key, "Content-Type": input.contentType },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1_000),
    }
  }

  async getObject(key: string, maxBytes: number): Promise<StoredObject> {
    const object = this.objects.get(key)
    if (!object) {
      throw new Error("Missing object")
    }
    if (object.contentLength > maxBytes) {
      throw new Error("Object is too large")
    }
    return object
  }

  async putObject(input: StoredObject & { key: string }): Promise<void> {
    this.objects.set(input.key, {
      body: input.body,
      contentLength: input.contentLength,
      contentType: input.contentType,
    })
    if (this.failAfterPut) {
      this.failAfterPut = false
      throw new Error("Upload acknowledgement failed")
    }
  }

  async deleteObject(key: string): Promise<void> {
    this.deleted.push(key)
    this.objects.delete(key)
  }

  getPublicUrl(key: string): string {
    return `https://media.example.test/${key}`
  }
}

const declaration = {
  fileName: "warehouse-proof.png",
  contentType: "image/png",
  size: 1_024,
}

describe("media adapter integration", () => {
  it("uses a random staging key and builds controlled variants after real-object verification", async () => {
    const storage = new MemoryStorage()
    const presigned = await createPresignedUpload({ declaration, storage })

    expect(presigned.key).toMatch(/^staging\/media\/[0-9a-f-]{36}$/)
    expect(presigned.key).not.toContain(declaration.fileName)
    expect(storage.posts[0]).toMatchObject({
      key: presigned.key,
      contentType: "image/png",
    })

    const body = await sharp({
      create: {
        width: 1_600,
        height: 1_067,
        channels: 3,
        background: "#315f4a",
      },
    }).png().toBuffer()
    storage.objects.set(presigned.key, {
      body,
      contentLength: body.byteLength,
      contentType: "image/png",
    })

    const completed = await completeUploadedImage({
      key: presigned.key,
      declaration: { ...declaration, size: body.byteLength },
      storage,
    })

    expect(completed.metadata).toMatchObject({
      version: 1,
      original: {
        contentType: "image/png",
        width: 1_600,
        height: 1_067,
        bytes: body.byteLength,
      },
    })
    expect(Object.keys(completed.metadata.variants)).toEqual([
      "primary",
      "card",
      "thumbnail",
      "social-share",
    ])
    expect(storage.objects.size).toBe(5)
  })

  it("deletes a staged object when its bytes contradict the declaration", async () => {
    const storage = new MemoryStorage()
    const presigned = await createPresignedUpload({ declaration, storage })
    const jpeg = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: "white",
      },
    }).jpeg().toBuffer()
    storage.objects.set(presigned.key, {
      body: jpeg,
      contentLength: jpeg.byteLength,
      contentType: "image/png",
    })

    await expect(completeUploadedImage({
      key: presigned.key,
      declaration: { ...declaration, size: jpeg.byteLength },
      storage,
    })).rejects.toMatchObject({ code: "CONTENT_MISMATCH" })
    expect(storage.deleted).toContain(presigned.key)
  })

  it("cleans a variant when storage writes it but loses the acknowledgement", async () => {
    const storage = new MemoryStorage()
    const presigned = await createPresignedUpload({ declaration, storage })
    const body = await sharp({
      create: {
        width: 200,
        height: 120,
        channels: 3,
        background: "white",
      },
    }).png().toBuffer()
    storage.objects.set(presigned.key, {
      body,
      contentLength: body.byteLength,
      contentType: "image/png",
    })
    storage.failAfterPut = true

    await expect(completeUploadedImage({
      key: presigned.key,
      declaration: { ...declaration, size: body.byteLength },
      storage,
    })).rejects.toMatchObject({ code: "PROCESSING_FAILED" })
    expect(storage.deleted).toEqual(expect.arrayContaining([
      presigned.key,
      expect.stringMatching(/\/primary\.webp$/),
    ]))
    expect(storage.objects.size).toBe(0)
  })
})

describe("translation adapter integration", () => {
  const text = "DEV-STOCK-READY-001 MOQ 1,000 pcs at USD 0.90–1.30, 30–45 days"

  it("persists only a completely restored Arabic draft", async () => {
    const saveDraft = vi.fn()
    const provider: TranslationProvider = {
      name: "fake",
      async translate(input) {
        return `مسودة ${input.text}`
      },
    }

    const result = await translateEnglishToArabic({
      text,
      protectedTerms: ["DEV-STOCK-READY-001"],
      provider,
      saveDraft,
    })

    expect(result).toEqual({
      success: true,
      text: `مسودة ${text}`,
      provider: "fake",
    })
    expect(saveDraft).toHaveBeenCalledWith({
      text: `مسودة ${text}`,
      provider: "fake",
    })
  })

  it("keeps the English draft when the provider fails or corrupts a token", async () => {
    const saveDraft = vi.fn()
    const failingProvider: TranslationProvider = {
      name: "failing",
      async translate() {
        throw new Error("provider unavailable")
      },
    }
    const corruptingProvider: TranslationProvider = {
      name: "corrupting",
      async translate(input) {
        return input.text.replace(/__HS_[A-F0-9]+_0__/, "")
      },
    }

    await expect(translateEnglishToArabic({ text, provider: failingProvider, saveDraft })).resolves.toMatchObject({
      success: false,
      code: "PROVIDER_ERROR",
      englishDraft: text,
    })
    await expect(translateEnglishToArabic({ text, provider: corruptingProvider, saveDraft })).resolves.toMatchObject({
      success: false,
      code: "TOKEN_INTEGRITY_ERROR",
      englishDraft: text,
    })
    expect(saveDraft).not.toHaveBeenCalled()
  })
})
