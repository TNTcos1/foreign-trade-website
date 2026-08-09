// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prisma } from "@/lib/prisma"
import { parseCatalogFilters } from "@/modules/catalog/filters"
import {
  createProductJsonLd,
  getPublicProductByCode,
  listPublicProducts,
} from "@/modules/catalog/queries"

const testPrefix = `TEST-CATALOG-${Date.now()}`
const publishedAt = new Date("2026-01-01T00:00:00.000Z")

beforeAll(async () => {
  await Promise.all([
    prisma.product.create({
      data: {
        code: `${testPrefix}-DRAFT`,
        type: "STOCK_LOT",
        status: "DRAFT",
        category: "Test category",
        purchaseUnit: "lot",
        publishedAt,
        translations: {
          create: {
            locale: "en",
            title: "Draft test product",
            summary: "Must remain private",
            description: "Must remain private",
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        code: `${testPrefix}-ARCHIVED`,
        type: "STOCK_LOT",
        status: "ARCHIVED",
        category: "Test category",
        purchaseUnit: "lot",
        publishedAt,
        archivedAt: new Date("2026-02-01T00:00:00.000Z"),
        translations: {
          create: {
            locale: "en",
            title: "Archived test product",
            summary: "Must remain private",
            description: "Must remain private",
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        code: `${testPrefix}-FUTURE`,
        type: "STOCK_LOT",
        status: "READY_STOCK",
        category: "Test category",
        purchaseUnit: "lot",
        publishedAt: new Date("2099-01-01T00:00:00.000Z"),
        translations: {
          create: {
            locale: "en",
            title: "Future test product",
            summary: "Must remain private until publication",
            description: "Must remain private until publication",
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        code: `${testPrefix}-EN-ONLY`,
        type: "SINGLE_STYLE",
        status: "READY_STOCK",
        category: "Test category",
        purchaseUnit: "piece",
        publishedAt,
        translations: {
          create: {
            locale: "en",
            title: "English-only test product",
            summary: "Visible only in English",
            description: "Visible only in English",
          },
        },
      },
    }),
  ])
})

afterAll(async () => {
  await prisma.product.deleteMany({ where: { code: { startsWith: testPrefix } } })
  await prisma.$disconnect()
})

describe("public catalog queries", () => {
  it("includes all public statuses and excludes private or future products", async () => {
    const catalog = await listPublicProducts(parseCatalogFilters({}), "en")
    const codes = catalog.items.map((product) => product.code)

    expect(codes).toEqual(
      expect.arrayContaining([
        "DEV-STOCK-READY-001",
        "DEV-STYLE-BOOKING-001",
        "DEV-STOCK-SOLD-001",
        `${testPrefix}-EN-ONLY`,
      ]),
    )
    expect(codes).not.toEqual(
      expect.arrayContaining([
        `${testPrefix}-DRAFT`,
        `${testPrefix}-ARCHIVED`,
        `${testPrefix}-FUTURE`,
      ]),
    )
    expect(catalog).toMatchObject({ page: 1, pageSize: 24 })
    expect(catalog.totalPages).toBe(Math.ceil(catalog.total / catalog.pageSize))
  })

  it("requires a translation for the requested locale", async () => {
    const filters = parseCatalogFilters({ search: `${testPrefix}-EN-ONLY` })

    await expect(listPublicProducts(filters, "en")).resolves.toMatchObject({ total: 1 })
    await expect(listPublicProducts(filters, "ar")).resolves.toMatchObject({ total: 0 })
  })

  it("applies whitelisted type, status, search, MOQ, and price filters", async () => {
    const stockLots = await listPublicProducts(
      parseCatalogFilters({ type: "STOCK_LOT", status: "SOLD_OUT" }),
      "en",
    )
    expect(stockLots.items.map(({ code }) => code)).toEqual(["DEV-STOCK-SOLD-001"])

    const searched = await listPublicProducts(
      parseCatalogFilters({ search: "Cotton Crew-Neck" }),
      "en",
    )
    expect(searched.items.map(({ code }) => code)).toEqual([
      "DEV-STYLE-BOOKING-001",
    ])

    const higherPrices = await listPublicProducts(
      parseCatalogFilters({ minPrice: "2" }),
      "en",
    )
    expect(higherPrices.items.map(({ code }) => code)).toContain(
      "DEV-STOCK-SOLD-001",
    )
    expect(higherPrices.items.map(({ code }) => code)).not.toContain(
      "DEV-STOCK-READY-001",
    )
    expect(higherPrices.items.map(({ code }) => code)).not.toContain(
      "DEV-STYLE-BOOKING-001",
    )

    const lowMoq = await listPublicProducts(
      parseCatalogFilters({ maxMoq: "3000", sort: "MOQ_ASC" }),
      "en",
    )
    expect(lowMoq.items.map(({ code }) => code)).toEqual([
      "DEV-STYLE-BOOKING-001",
    ])
  })

  it("returns localized serializable card and detail DTOs", async () => {
    const arabic = await getPublicProductByCode("DEV-STOCK-READY-001", "ar")

    expect(arabic).not.toBeNull()
    expect(arabic?.title).toContain("مخزون")
    expect(arabic?.availableLocales).toEqual(["en", "ar"])
    expect(arabic?.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(arabic?.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(arabic?.priceVisibility).toEqual({
      kind: "REFERENCE_PRICE",
      currency: "USD",
      minimum: "1.2",
      maximum: "1.55",
      basis: "per piece",
    })
    expect(arabic?.stockLotDetails).toMatchObject({
      totalPieces: 24000,
      totalWeightKg: "7200",
      totalVolumeCbm: "54",
    })
    expect(arabic?.stockLotDetails?.categoryComposition).toEqual(
      expect.any(Object),
    )
    expect(arabic?.media[0]).toMatchObject({
      mediaType: "IMAGE",
      isPrimary: true,
    })
    expect(arabic?.media[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(() => JSON.stringify(arabic)).not.toThrow()
  })

  it("keeps sold-out details public but disables inquiry actions", async () => {
    const product = await getPublicProductByCode("DEV-STOCK-SOLD-001", "en")

    expect(product).toMatchObject({
      status: "SOLD_OUT",
      canAddToInquiry: false,
    })
    expect(product?.relatedProducts.every(({ code }) => code !== product.code)).toBe(
      true,
    )
  })

  it("does not invent offers for contact-quote products", async () => {
    const product = await getPublicProductByCode(
      "DEV-STYLE-BOOKING-001",
      "en",
    )

    expect(product?.priceVisibility).toEqual({ kind: "CONTACT_FOR_QUOTE" })
    const jsonLd = createProductJsonLd(product!, "en")
    expect(jsonLd).not.toHaveProperty("offers")
    expect(jsonLd).toMatchObject({
      "@type": "Product",
      sku: "DEV-STYLE-BOOKING-001",
      availability: "https://schema.org/PreOrder",
    })
  })

  it("omits non-HTTP media URLs from product structured data", async () => {
    const product = await getPublicProductByCode("DEV-STOCK-READY-001", "en")
    const unsafeProduct = {
      ...product!,
      media: [
        ...product!.media,
        {
          ...product!.media[0],
          id: "unsafe-media",
          url: "javascript:alert(1)",
        },
      ],
    }

    const jsonLd = createProductJsonLd(unsafeProduct, "en")
    expect(jsonLd.image ?? []).not.toContain("javascript:alert(1)")
  })

  it("returns null for missing, private, future, or untranslated products", async () => {
    await expect(getPublicProductByCode("MISSING-CODE", "en")).resolves.toBeNull()
    await expect(
      getPublicProductByCode(`${testPrefix}-DRAFT`, "en"),
    ).resolves.toBeNull()
    await expect(
      getPublicProductByCode(`${testPrefix}-FUTURE`, "en"),
    ).resolves.toBeNull()
    await expect(
      getPublicProductByCode(`${testPrefix}-EN-ONLY`, "ar"),
    ).resolves.toBeNull()
    await expect(
      getPublicProductByCode(`${testPrefix}-EN-ONLY`, "en"),
    ).resolves.toMatchObject({ availableLocales: ["en"] })
  })
})
