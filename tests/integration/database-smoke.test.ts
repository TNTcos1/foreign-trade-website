// @vitest-environment node

import { afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { canAddToInquiry, canDisplayPublicProduct } from "@/modules/catalog/domain"

const seedProductCodes = ["DEV-STOCK-READY-001", "DEV-STYLE-BOOKING-001", "DEV-STOCK-SOLD-001"]

afterAll(async () => {
  await prisma.$disconnect()
})

describe("seeded catalog database", () => {
  it("contains both product templates and all three public states", async () => {
    const products = await prisma.product.findMany({
      where: { code: { in: seedProductCodes } },
      include: {
        stockLotDetails: true,
        singleStyleDetails: true,
        translations: true,
        media: true,
      },
      orderBy: { code: "asc" },
    })

    expect(products).toHaveLength(3)
    expect(new Set(products.map((product) => product.type))).toEqual(new Set(["STOCK_LOT", "SINGLE_STYLE"]))
    expect(new Set(products.map((product) => product.status))).toEqual(
      new Set(["READY_STOCK", "FACTORY_BOOKING", "SOLD_OUT"]),
    )

    const readyStock = products.find((product) => product.code === "DEV-STOCK-READY-001")!
    const factoryBooking = products.find((product) => product.code === "DEV-STYLE-BOOKING-001")!
    const soldOut = products.find((product) => product.code === "DEV-STOCK-SOLD-001")!

    expect(readyStock.stockLotDetails?.totalPieces).toBe(24000)
    expect(readyStock.singleStyleDetails).toBeNull()
    expect(factoryBooking.singleStyleDetails?.styleNumber).toBe("DEV-TS-180")
    expect(factoryBooking.stockLotDetails).toBeNull()
    expect(soldOut.stockLotDetails?.totalPieces).toBe(8000)

    for (const product of products) {
      expect(product.translations.map(({ locale }) => locale).sort()).toEqual(["ar", "en"])
      expect(product.media).toHaveLength(1)
      expect(product.media[0]).toMatchObject({ mediaType: "IMAGE", isPrimary: true, sortOrder: 0 })
      expect(canDisplayPublicProduct(product.status)).toBe(true)
    }

    expect(canAddToInquiry(readyStock.status)).toBe(true)
    expect(canAddToInquiry(factoryBooking.status)).toBe(true)
    expect(canAddToInquiry(soldOut.status)).toBe(false)
  })

  it("contains development users, published bilingual content, market links, and source examples", async () => {
    const marketCodes = ["middle-east", "yemen", "india", "central-asia", "south-asia"]
    const [users, companyPage, contentPages, marketPages, sourceVisits] = await Promise.all([
      prisma.adminUser.findMany({ where: { email: { endsWith: "@clearance.local.invalid" } } }),
      prisma.contentPage.findUnique({ where: { slug: "company" }, include: { translations: true } }),
      prisma.contentPage.findMany({
        where: { slug: { in: ["why-us", "how-to-buy", "contact"] } },
        include: { translations: true },
        orderBy: { slug: "asc" },
      }),
      prisma.marketPage.findMany({
        where: { marketCode: { in: marketCodes } },
        include: {
          contentPage: { include: { translations: true } },
          products: { include: { product: true }, orderBy: { sortOrder: "asc" } },
        },
        orderBy: { marketCode: "asc" },
      }),
      prisma.sourceVisit.findMany({ where: { sessionId: { startsWith: "dev-session-" } } }),
    ])

    expect(users).toHaveLength(3)
    expect(new Set(users.map((user) => user.role))).toEqual(new Set(["ADMIN", "EDITOR", "SALES"]))
    expect(users.every((user) => user.developmentOnly && user.active)).toBe(true)
    expect(users.every((user) => user.passwordHash.startsWith("$2b$12$") && !user.passwordHash.includes("password"))).toBe(
      true,
    )

    expect(companyPage?.publishedAt).toBeInstanceOf(Date)
    expect(companyPage?.translations.map(({ locale }) => locale).sort()).toEqual(["ar", "en"])

    expect(contentPages.map(({ slug }) => slug)).toEqual(["contact", "how-to-buy", "why-us"])
    expect(contentPages.every(({ publishedAt }) => publishedAt instanceof Date)).toBe(true)
    expect(contentPages.every(({ translations }) =>
      translations.map(({ locale }) => locale).sort().join(",") === "ar,en"
    )).toBe(true)

    expect(marketPages.map(({ marketCode }) => marketCode).sort()).toEqual([...marketCodes].sort())
    for (const seededMarket of marketPages) {
      expect(seededMarket.contentPage.publishedAt).toBeInstanceOf(Date)
      expect(seededMarket.contentPage.translations.map(({ locale }) => locale).sort()).toEqual(["ar", "en"])
      expect(seededMarket.products.map(({ product }) => product.code)).toEqual(seedProductCodes)
      expect(seededMarket.products.filter(({ featured }) => featured)).toHaveLength(2)
    }

    expect(sourceVisits).toHaveLength(2)
    expect(new Set(sourceVisits.map(({ channel }) => channel))).toEqual(new Set(["WHATSAPP", "QR"]))
    expect(sourceVisits.some(({ firstProductId }) => firstProductId !== null)).toBe(true)
    expect(sourceVisits.some(({ marketPageId }) => marketPageId !== null)).toBe(true)
  })
})
