// @vitest-environment node

import sharp from "sharp"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prisma } from "@/lib/prisma"
import { completeAndAttachProductImage } from "@/modules/admin/media-service"
import type {
  ObjectStorage,
  PresignedPost,
  StoredObject,
} from "@/modules/media/storage"

class MemoryStorage implements ObjectStorage {
  readonly deleted: string[] = []
  readonly objects = new Map<string, StoredObject>()
  failPublicUrl = false

  async createPresignedPost(): Promise<PresignedPost> {
    throw new Error("Not used")
  }

  async getObject(key: string, maxBytes: number): Promise<StoredObject> {
    const object = this.objects.get(key)
    if (!object || object.contentLength > maxBytes) {
      throw new Error("Missing object")
    }
    return object
  }

  async putObject(input: StoredObject & { key: string }): Promise<void> {
    this.objects.set(input.key, {
      body: input.body,
      contentLength: input.contentLength,
      contentType: input.contentType,
    })
  }

  async deleteObject(key: string): Promise<void> {
    this.deleted.push(key)
    this.objects.delete(key)
  }

  getPublicUrl(key: string): string {
    if (this.failPublicUrl) {
      throw new Error("Public URL unavailable")
    }
    return `https://media.example.test/${key}`
  }
}

const testPrefix = `TEST-ADMIN-MEDIA-${Date.now()}`
let actorId = ""
let productId = ""

beforeAll(async () => {
  const actor = await prisma.adminUser.create({
    data: {
      email: `${testPrefix.toLowerCase()}@example.test`,
      name: "Admin Media Test Editor",
      passwordHash: "not-used",
      role: "EDITOR",
    },
  })
  actorId = actor.id
  const product = await prisma.product.create({
    data: {
      code: testPrefix,
      type: "SINGLE_STYLE",
      status: "DRAFT",
      category: "Test clothing",
      purchaseUnit: "piece",
      createdById: actorId,
      updatedById: actorId,
    },
  })
  productId = product.id
})

afterAll(async () => {
  await prisma.product.deleteMany({ where: { id: productId } })
  await prisma.adminUser.deleteMany({ where: { id: actorId } })
  await prisma.$disconnect()
})

async function stagedImage(storage: MemoryStorage, identifier: string) {
  const key = `staging/media/${identifier}`
  const body = await sharp({
    create: {
      width: 200,
      height: 120,
      channels: 3,
      background: "#315f4a",
    },
  }).png().toBuffer()
  storage.objects.set(key, {
    body,
    contentLength: body.byteLength,
    contentType: "image/png",
  })
  return {
    key,
    declaration: {
      fileName: "warehouse-proof.png",
      contentType: "image/png",
      size: body.byteLength,
    },
  }
}

describe("admin product media attachment", () => {
  it("stores only server-controlled public media and removes private staging objects", async () => {
    const storage = new MemoryStorage()
    const upload = await stagedImage(storage, "00000000-0000-4000-8000-000000000010")

    const media = await completeAndAttachProductImage({
      productId,
      ...upload,
      altText: "Warehouse proof",
      sortOrder: 0,
      isPrimary: true,
      actorId,
      storage,
    })
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: { media: true },
    })

    expect(media.url).toBe(
      "https://media.example.test/public/media/00000000-0000-4000-8000-000000000010/primary.webp",
    )
    expect(product.updatedById).toBe(actorId)
    expect(product.media).toHaveLength(1)
    expect(product.media[0].metadata).toMatchObject({
      version: 1,
      variants: {
        primary: {
          key: "public/media/00000000-0000-4000-8000-000000000010/primary.webp",
          url: media.url,
        },
      },
    })
    expect([...storage.objects.keys()]).toEqual(expect.arrayContaining([
      expect.stringMatching(/^public\/media\/00000000-0000-4000-8000-000000000010\//),
    ]))
    expect([...storage.objects.keys()].some((key) => key.startsWith("staging/"))).toBe(false)
  })

  it("removes private objects when public promotion fails", async () => {
    const storage = new MemoryStorage()
    storage.failPublicUrl = true
    const upload = await stagedImage(storage, "00000000-0000-4000-8000-000000000012")

    await expect(completeAndAttachProductImage({
      productId,
      ...upload,
      altText: "Failed promotion",
      sortOrder: 1,
      isPrimary: false,
      actorId,
      storage,
    })).rejects.toMatchObject({ code: "PROCESSING_FAILED" })

    expect(storage.objects.size).toBe(0)
    expect(storage.deleted).toEqual(expect.arrayContaining([
      upload.key,
      expect.stringMatching(/^staging\/media\/00000000-0000-4000-8000-000000000012\//),
      expect.stringMatching(/^public\/media\/00000000-0000-4000-8000-000000000012\//),
    ]))
  })

  it("rolls back promoted and private objects when the database association fails", async () => {
    const storage = new MemoryStorage()
    const upload = await stagedImage(storage, "00000000-0000-4000-8000-000000000011")

    await expect(completeAndAttachProductImage({
      productId,
      ...upload,
      altText: "Conflicting media",
      sortOrder: 0,
      isPrimary: true,
      actorId,
      storage,
    })).rejects.toBeDefined()

    const media = await prisma.productMedia.findMany({ where: { productId } })
    expect(media).toHaveLength(1)
    expect(media[0].isPrimary).toBe(true)
    expect(storage.objects.size).toBe(0)
    expect(storage.deleted).toEqual(expect.arrayContaining([
      upload.key,
      expect.stringMatching(/^staging\/media\/00000000-0000-4000-8000-000000000011\//),
      expect.stringMatching(/^public\/media\/00000000-0000-4000-8000-000000000011\//),
    ]))
  })
})
