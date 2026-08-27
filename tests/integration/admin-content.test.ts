// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prisma } from "@/lib/prisma"
import {
  archiveProduct,
  createProductDraft,
  duplicateProduct,
  markProductSoldOut,
  publishProductLocale,
  restoreProduct,
  saveProductTranslation,
  unpublishProductLocale,
  updateProductDraft,
} from "@/modules/admin/product-service"
import {
  publishContentLocale,
  saveContentTranslation,
  unpublishContentLocale,
} from "@/modules/admin/content-service"
import {
  getAdminContentPage,
  getAdminProduct,
  listAdminContentPages,
  listAdminProducts,
} from "@/modules/admin/queries"
import { AdminServiceError, type ProductBusinessInput } from "@/modules/admin/validation"
import { getPublicProductByCode } from "@/modules/catalog/queries"
import { getContentPage } from "@/modules/content/queries"

const testPrefix = `TEST-ADMIN-${Date.now()}`
const contentSlug = `${testPrefix.toLowerCase()}-content`
let actorId = ""
let productId = ""

beforeAll(async () => {
  const actor = await prisma.adminUser.create({
    data: {
      email: `${testPrefix.toLowerCase()}@example.test`,
      name: "Admin Content Test Editor",
      passwordHash: "not-used",
      role: "EDITOR",
    },
  })
  actorId = actor.id

  await prisma.contentPage.create({
    data: {
      slug: contentSlug,
      pageType: "TRUST",
      createdById: actorId,
      updatedById: actorId,
    },
  })
})

afterAll(async () => {
  await prisma.contentPage.deleteMany({ where: { slug: contentSlug } })
  await prisma.product.deleteMany({ where: { code: { startsWith: testPrefix } } })
  await prisma.adminUser.deleteMany({ where: { id: actorId } })
  await prisma.$disconnect()
})

describe("admin product management", () => {
  it("creates a complete English draft without making it public", async () => {
    const product = await createProductDraft({
      type: "STOCK_LOT",
      code: `${testPrefix}-LOT`,
      status: "READY_STOCK",
      category: "Mixed clothing",
      purchaseUnit: "lot",
      minimumOrderQuantity: 1_000,
      currency: "USD",
      referencePriceMin: "1.20",
      referencePriceMax: "1.50",
      priceBasis: "per piece",
      availableQuantity: 8_000,
      translation: {
        title: "Admin draft stock lot",
        summary: "A complete English draft that remains private.",
        description: "Private until its English locale is explicitly published.",
        seoTitle: null,
        seoDescription: null,
        shareImageAlt: null,
      },
      stockLotDetails: {
        totalPieces: 8_000,
        totalPackages: 80,
        totalWeightKg: "2400",
        totalVolumeCbm: "20",
        sizeRange: "S-XL",
        piecesPerPackage: 100,
      },
    }, actorId)
    productId = product.id

    expect(product).toMatchObject({
      code: `${testPrefix}-LOT`,
      status: "READY_STOCK",
      publishedAt: null,
    })
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "en")).resolves.toBeNull()
  })

  it("keeps Arabic as a draft until English and then Arabic are explicitly published", async () => {
    await saveProductTranslation(productId, "ar", {
      title: "دفعة مخزون إدارية",
      summary: "مسودة عربية تبقى خاصة.",
      description: "لا تظهر قبل النشر الصريح.",
      seoTitle: null,
      seoDescription: null,
      shareImageAlt: null,
    }, actorId)

    await expect(publishProductLocale(productId, "ar", actorId)).rejects.toEqual(
      new AdminServiceError("ENGLISH_PUBLICATION_REQUIRED"),
    )
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "ar")).resolves.toBeNull()

    await publishProductLocale(productId, "en", actorId)
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "en")).resolves.toMatchObject({
      title: "Admin draft stock lot",
      availableLocales: ["en"],
    })
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "ar")).resolves.toBeNull()

    await publishProductLocale(productId, "ar", actorId)
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "ar")).resolves.toMatchObject({
      title: "دفعة مخزون إدارية",
      availableLocales: ["en", "ar"],
    })
  })

  it("keeps published product copy unchanged until draft changes are published", async () => {
    await saveProductTranslation(productId, "en", {
      title: "Reviewed admin stock lot",
      summary: "A revised English draft that remains private.",
      description: "The public page keeps the last published copy until review completes.",
      seoTitle: null,
      seoDescription: null,
      shareImageAlt: null,
    }, actorId)

    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "en")).resolves.toMatchObject({
      title: "Admin draft stock lot",
    })
    await expect(getAdminProduct(productId)).resolves.toMatchObject({
      translations: expect.arrayContaining([
        expect.objectContaining({
          locale: "en",
          title: "Reviewed admin stock lot",
          hasDraftChanges: true,
        }),
      ]),
    })

    const published = await publishProductLocale(productId, "en", actorId)
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "en")).resolves.toMatchObject({
      title: "Reviewed admin stock lot",
    })
    await expect(getAdminProduct(productId)).resolves.toMatchObject({
      translations: expect.arrayContaining([
        expect.objectContaining({ locale: "en", hasDraftChanges: false }),
      ]),
    })
    await expect(prisma.$queryRaw<Array<{ isNull: boolean }>>`
      SELECT "draftData" IS NULL AS "isNull"
      FROM "ProductTranslation"
      WHERE "id" = ${published.id}::uuid
    `).resolves.toEqual([{ isNull: true }])
  })

  it("keeps published business facts unchanged until draft changes are published", async () => {
    const before = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: { translations: true },
    })

    const updated = await updateProductDraft(productId, {
      type: "STOCK_LOT",
      status: "READY_STOCK",
      category: "Mixed export clothing",
      genderAge: "Adults",
      season: "All season",
      tags: ["inspected", "warehouse-ready"],
      sourceType: "Owned stock",
      sourceLocation: "Quanzhou",
      qualityGrade: "A/B",
      clearanceReason: "Export clearance",
      defectNotes: null,
      inspectionAvailable: true,
      purchaseUnit: "lot",
      minimumOrderQuantity: 1_200,
      tradeTerms: "FOB Xiamen",
      currency: "USD",
      referencePriceMin: "1.25",
      referencePriceMax: "1.55",
      priceBasis: "per piece",
      availableQuantity: 8_000,
      stockLotDetails: {
        totalPieces: 8_000,
        totalPackages: 80,
        totalWeightKg: "2450",
        totalVolumeCbm: "20.5",
        sizeRange: "S-XL",
        piecesPerPackage: 100,
      },
      singleStyleDetails: null,
    }, actorId)
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: { translations: true },
    })

    expect(updated).toMatchObject({
      category: "Mixed export clothing",
      minimumOrderQuantity: 1_200,
      hasDraftChanges: true,
    })
    expect(after.publishedAt).toEqual(before.publishedAt)
    expect(after.translations.map(({ locale, publishedAt }) => ({ locale, publishedAt }))).toEqual(
      before.translations.map(({ locale, publishedAt }) => ({ locale, publishedAt })),
    )
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "en")).resolves.toMatchObject({
      category: "Mixed clothing",
      minimumOrderQuantity: 1_000,
      stockLotDetails: { totalWeightKg: "2400" },
    })
    await expect(getAdminProduct(productId)).resolves.toMatchObject({
      category: "Mixed export clothing",
      minimumOrderQuantity: 1_200,
      stockLotDetails: { totalWeightKg: "2450" },
      hasDraftChanges: true,
    })

    await publishProductLocale(productId, "ar", actorId)
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "en")).resolves.toMatchObject({
      category: "Mixed clothing",
      minimumOrderQuantity: 1_000,
      stockLotDetails: { totalWeightKg: "2400" },
    })
    await expect(getAdminProduct(productId)).resolves.toMatchObject({
      category: "Mixed export clothing",
      minimumOrderQuantity: 1_200,
      hasDraftChanges: true,
    })

    await publishProductLocale(productId, "en", actorId)
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "en")).resolves.toMatchObject({
      category: "Mixed export clothing",
      minimumOrderQuantity: 1_200,
      stockLotDetails: { totalWeightKg: "2450" },
    })
    await expect(getAdminProduct(productId)).resolves.toMatchObject({
      hasDraftChanges: false,
    })
    await expect(prisma.$queryRaw<Array<{ isNull: boolean }>>`
      SELECT "draftData" IS NULL AS "isNull"
      FROM "Product"
      WHERE "id" = ${productId}::uuid
    `).resolves.toEqual([{ isNull: true }])
  })

  it("unpublishes one locale without hiding another and keeps sold-out details public", async () => {
    await unpublishProductLocale(productId, "ar", actorId)
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "ar")).resolves.toBeNull()
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "en")).resolves.not.toBeNull()

    const adminProduct = await getAdminProduct(productId)
    expect(adminProduct).toMatchObject({
      id: productId,
      referencePriceMin: "1.25",
      referencePriceMax: "1.55",
      stockLotDetails: { totalWeightKg: "2450", totalVolumeCbm: "20.5" },
    })
    expect(adminProduct?.translations).toEqual(expect.arrayContaining([
      expect.objectContaining({ locale: "en", publishedAt: expect.any(String) }),
      expect.objectContaining({ locale: "ar", publishedAt: null }),
    ]))
    await expect(listAdminProducts()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: productId, code: `${testPrefix}-LOT` }),
    ]))

    const pendingBusinessFacts: ProductBusinessInput = {
      type: "STOCK_LOT",
      status: "READY_STOCK",
      category: "Pending facts that must not restore availability",
      genderAge: "Adults",
      season: "All season",
      tags: ["pending-review"],
      sourceType: "Owned stock",
      sourceLocation: "Quanzhou",
      qualityGrade: "A/B",
      clearanceReason: "Export clearance",
      defectNotes: null,
      inspectionAvailable: true,
      purchaseUnit: "lot",
      minimumOrderQuantity: 1_500,
      tradeTerms: "FOB Xiamen",
      currency: "USD",
      referencePriceMin: "1.30",
      referencePriceMax: "1.60",
      priceBasis: "per piece",
      availableQuantity: 7_500,
      stockLotDetails: {
        totalPieces: 7_500,
        totalPackages: 75,
        totalWeightKg: "2300",
        totalVolumeCbm: "19",
        sizeRange: "S-XL",
        piecesPerPackage: 100,
      },
      singleStyleDetails: null,
    }
    await updateProductDraft(productId, pendingBusinessFacts, actorId)
    await markProductSoldOut(productId, actorId)
    await publishProductLocale(productId, "en", actorId)
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "en")).resolves.toMatchObject({
      status: "SOLD_OUT",
      availableQuantity: 0,
      canAddToInquiry: false,
    })
    await expect(getAdminProduct(productId)).resolves.toMatchObject({
      status: "SOLD_OUT",
      availableQuantity: 0,
      hasDraftChanges: false,
    })
  })

  it("duplicates the current private draft and excludes publication state and media", async () => {
    await updateProductDraft(productId, {
      type: "STOCK_LOT",
      status: "READY_STOCK",
      category: "Private draft category",
      genderAge: "Adults",
      season: "All season",
      tags: ["private-copy"],
      sourceType: "Owned stock",
      sourceLocation: "Quanzhou",
      qualityGrade: "A/B",
      clearanceReason: "Export clearance",
      defectNotes: null,
      inspectionAvailable: true,
      purchaseUnit: "lot",
      minimumOrderQuantity: 1_750,
      tradeTerms: "FOB Xiamen",
      currency: "USD",
      referencePriceMin: "1.35",
      referencePriceMax: "1.65",
      priceBasis: "per piece",
      availableQuantity: 7_000,
      stockLotDetails: {
        totalPieces: 7_000,
        totalPackages: 70,
        totalWeightKg: "2200",
        totalVolumeCbm: "18",
        sizeRange: "S-XL",
        piecesPerPackage: 100,
      },
      singleStyleDetails: null,
    }, actorId)
    await saveProductTranslation(productId, "en", {
      title: "Private duplicate source title",
      summary: "The duplicate should use this pending copy.",
      description: "This copy remains private on the source product.",
      seoTitle: null,
      seoDescription: null,
      shareImageAlt: null,
    }, actorId)
    await prisma.productMedia.create({
      data: {
        productId,
        mediaType: "IMAGE",
        url: "/seed-media/private-admin-test.jpg",
        sortOrder: 0,
        isPrimary: true,
      },
    })
    const duplicate = await duplicateProduct(
      productId,
      `${testPrefix}-COPY`,
      actorId,
    )
    const stored = await prisma.product.findUniqueOrThrow({
      where: { id: duplicate.id },
      include: {
        translations: true,
        media: true,
        stockLotDetails: true,
      },
    })

    expect(stored).toMatchObject({
      code: `${testPrefix}-COPY`,
      status: "DRAFT",
      category: "Private draft category",
      minimumOrderQuantity: 1_750,
      availableQuantity: 7_000,
      publishedAt: null,
      archivedAt: null,
      stockLotDetails: { totalPieces: 7_000 },
    })
    expect(stored.stockLotDetails?.totalWeightKg?.toString()).toBe("2200")
    expect(stored.translations).toEqual(expect.arrayContaining([
      expect.objectContaining({ locale: "en", title: "Private duplicate source title" }),
    ]))
    expect(stored.translations).toHaveLength(2)
    expect(stored.translations.every(({ publishedAt }) => publishedAt === null)).toBe(true)
    expect(stored.media).toEqual([])
    expect(stored.stockLotDetails).toMatchObject({ totalPieces: 7_000 })
  })

  it("archives public products and restores them as private drafts", async () => {
    await archiveProduct(productId, actorId)
    await expect(getPublicProductByCode(`${testPrefix}-LOT`, "en")).resolves.toBeNull()

    await restoreProduct(productId, actorId)
    const restored = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: { translations: true },
    })
    expect(restored).toMatchObject({
      status: "DRAFT",
      publishedAt: null,
      archivedAt: null,
    })
    expect(restored.translations.every(({ publishedAt }) => publishedAt === null)).toBe(true)
  })
})

describe("admin content management", () => {
  it("saves drafts and publishes each locale independently", async () => {
    await saveContentTranslation(contentSlug, "en", {
      title: "Admin trust content",
      summary: "Published English content",
      body: "Warehouse proof and inspection evidence.",
      seoTitle: null,
      seoDescription: null,
    }, actorId)
    await saveContentTranslation(contentSlug, "ar", {
      title: "محتوى الثقة الإداري",
      summary: "مسودة عربية خاصة",
      body: "أدلة المستودع والفحص.",
      seoTitle: null,
      seoDescription: null,
    }, actorId)

    await expect(getAdminContentPage(contentSlug)).resolves.toMatchObject({
      slug: contentSlug,
      translations: expect.arrayContaining([
        expect.objectContaining({ locale: "en", publishedAt: null }),
        expect.objectContaining({ locale: "ar", publishedAt: null }),
      ]),
    })
    await expect(listAdminContentPages()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: contentSlug, localeStates: { en: "DRAFT", ar: "DRAFT" } }),
    ]))

    await expect(publishContentLocale(contentSlug, "ar", actorId)).rejects.toEqual(
      new AdminServiceError("ENGLISH_PUBLICATION_REQUIRED"),
    )
    await expect(getContentPage(contentSlug, "en")).resolves.toBeNull()

    await publishContentLocale(contentSlug, "en", actorId)
    await expect(getContentPage(contentSlug, "en")).resolves.toMatchObject({
      title: "Admin trust content",
      availableLocales: ["en"],
    })
    await expect(getContentPage(contentSlug, "ar")).resolves.toBeNull()

    await publishContentLocale(contentSlug, "ar", actorId)
    await expect(getContentPage(contentSlug, "ar")).resolves.toMatchObject({
      title: "محتوى الثقة الإداري",
      availableLocales: ["en", "ar"],
    })

    await saveContentTranslation(contentSlug, "en", {
      title: "Reviewed trust content",
      summary: "A revised content draft that remains private.",
      body: "The public page keeps its previously published evidence.",
      seoTitle: null,
      seoDescription: null,
    }, actorId)
    await expect(getContentPage(contentSlug, "en")).resolves.toMatchObject({
      title: "Admin trust content",
    })
    await expect(getAdminContentPage(contentSlug)).resolves.toMatchObject({
      translations: expect.arrayContaining([
        expect.objectContaining({
          locale: "en",
          title: "Reviewed trust content",
          hasDraftChanges: true,
        }),
      ]),
    })

    const published = await publishContentLocale(contentSlug, "en", actorId)
    await expect(getContentPage(contentSlug, "en")).resolves.toMatchObject({
      title: "Reviewed trust content",
    })
    await expect(getAdminContentPage(contentSlug)).resolves.toMatchObject({
      translations: expect.arrayContaining([
        expect.objectContaining({ locale: "en", hasDraftChanges: false }),
      ]),
    })
    await expect(prisma.$queryRaw<Array<{ isNull: boolean }>>`
      SELECT "draftData" IS NULL AS "isNull"
      FROM "ContentTranslation"
      WHERE "id" = ${published.id}::uuid
    `).resolves.toEqual([{ isNull: true }])

    await saveContentTranslation(contentSlug, "ar", {
      title: "محتوى ثقة بانتظار المراجعة",
      summary: "تعديلات عربية تبقى خاصة.",
      body: "تبقى النسخة العامة السابقة حتى النشر الصريح.",
      seoTitle: null,
      seoDescription: null,
    }, actorId)
    await unpublishContentLocale(contentSlug, "ar", actorId)
    await expect(getContentPage(contentSlug, "ar")).resolves.toBeNull()
    await expect(getContentPage(contentSlug, "en")).resolves.not.toBeNull()
    await expect(getAdminContentPage(contentSlug)).resolves.toMatchObject({
      translations: expect.arrayContaining([
        expect.objectContaining({
          locale: "ar",
          title: "محتوى ثقة بانتظار المراجعة",
          hasDraftChanges: true,
        }),
      ]),
    })
  })
})
