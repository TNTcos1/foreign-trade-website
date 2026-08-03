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
    const [users, companyPage, marketPage, sourceVisits] = await Promise.all([
      prisma.adminUser.findMany({ where: { email: { endsWith: "@clearance.local.invalid" } } }),
      prisma.contentPage.findUnique({ where: { slug: "company" }, include: { translations: true } }),
      prisma.marketPage.findUnique({
        where: { marketCode: "yemen" },
        include: {
          contentPage: { include: { translations: true } },
          products: { include: { product: true }, orderBy: { sortOrder: "asc" } },
        },
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

    expect(marketPage?.contentPage.publishedAt).toBeInstanceOf(Date)
    expect(marketPage?.contentPage.translations.map(({ locale }) => locale).sort()).toEqual(["ar", "en"])
    expect(marketPage?.products.map(({ product }) => product.code)).toEqual(seedProductCodes)

    expect(sourceVisits).toHaveLength(2)
    expect(new Set(sourceVisits.map(({ channel }) => channel))).toEqual(new Set(["WHATSAPP", "QR"]))
    expect(sourceVisits.some(({ firstProductId }) => firstProductId !== null)).toBe(true)
    expect(sourceVisits.some(({ marketPageId }) => marketPageId !== null)).toBe(true)
  })
})
