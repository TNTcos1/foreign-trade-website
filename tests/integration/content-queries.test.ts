// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prisma } from "@/lib/prisma"
import { getContentPage, getMarketPage } from "@/modules/content/queries"

const testPrefix = `test-content-${Date.now()}`
const marketCode = `${testPrefix}-market`
const publishedAt = new Date("2026-01-01T00:00:00.000Z")
const productCodes = {
  public: `${testPrefix}-PUBLIC`,
  draft: `${testPrefix}-DRAFT`,
  future: `${testPrefix}-FUTURE`,
  englishOnly: `${testPrefix}-EN-ONLY`,
  notFeatured: `${testPrefix}-NOT-FEATURED`,
}

beforeAll(async () => {
  const [publicProduct, draftProduct, futureProduct, englishOnlyProduct, notFeaturedProduct] = await Promise.all([
    prisma.product.create({
      data: {
        code: productCodes.public,
        type: "STOCK_LOT",
        status: "READY_STOCK",
        category: "Test category",
        purchaseUnit: "lot",
        publishedAt,
        translations: {
          create: [
            {
              locale: "en",
              title: "Public featured lot",
              summary: "Public English summary",
              description: "Public English description",
              publishedAt,
            },
            {
              locale: "ar",
              title: "دفعة عامة مميزة",
              summary: "ملخص عربي عام",
              description: "وصف عربي عام",
              publishedAt,
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        code: productCodes.draft,
        type: "STOCK_LOT",
        status: "DRAFT",
        category: "Test category",
        purchaseUnit: "lot",
        publishedAt,
        translations: {
          create: {
            locale: "en",
            title: "Draft featured lot",
            summary: "Private draft",
            description: "Private draft",
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        code: productCodes.future,
        type: "STOCK_LOT",
        status: "READY_STOCK",
        category: "Test category",
        purchaseUnit: "lot",
        publishedAt: new Date("2099-01-01T00:00:00.000Z"),
        translations: {
          create: {
            locale: "en",
            title: "Future featured lot",
            summary: "Private until publication",
            description: "Private until publication",
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        code: productCodes.englishOnly,
        type: "SINGLE_STYLE",
        status: "FACTORY_BOOKING",
        category: "Test category",
        purchaseUnit: "piece",
        publishedAt,
        translations: {
          create: {
            locale: "en",
            title: "English-only featured style",
            summary: "Visible only in English",
            description: "Visible only in English",
            publishedAt,
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        code: productCodes.notFeatured,
        type: "STOCK_LOT",
        status: "READY_STOCK",
        category: "Test category",
        purchaseUnit: "lot",
        publishedAt,
        translations: {
          create: {
            locale: "en",
            title: "Non-featured lot",
            summary: "Public but not selected",
            description: "Public but not selected",
          },
        },
      },
    }),
  ])

  await Promise.all([
    prisma.contentPage.create({
      data: {
        slug: `${testPrefix}-published`,
        pageType: "TRUST",
        publishedAt,
        translations: {
          create: [
            {
              locale: "en",
              title: "Published trust page",
              summary: "English trust summary",
              body: "English trust body",
              seoTitle: "English SEO title",
              seoDescription: "English SEO description",
              publishedAt,
            },
            {
              locale: "ar",
              title: "صفحة الثقة المنشورة",
              summary: "ملخص الثقة العربي",
              body: "محتوى الثقة العربي",
              seoTitle: "عنوان عربي لمحركات البحث",
              seoDescription: "وصف عربي لمحركات البحث",
              publishedAt,
            },
          ],
        },
      },
    }),
    prisma.contentPage.create({
      data: {
        slug: `${testPrefix}-unpublished`,
        pageType: "TRUST",
        publishedAt: null,
        translations: {
          create: {
            locale: "en",
            title: "Unpublished page",
            body: "Private content",
          },
        },
      },
    }),
    prisma.contentPage.create({
      data: {
        slug: `${testPrefix}-en-only`,
        pageType: "CONTACT",
        publishedAt,
        translations: {
          create: [
            {
              locale: "en",
              title: "English-only content",
              body: "No Arabic fallback",
              publishedAt,
            },
            {
              locale: "ar",
              title: "مسودة عربية خاصة",
              body: "يجب ألا تظهر للعامة",
              publishedAt: null,
            },
          ],
        },
      },
    }),
    prisma.contentPage.create({
      data: {
        slug: `markets/${marketCode}`,
        pageType: "MARKET",
        publishedAt,
        translations: {
          create: [
            {
              locale: "en",
              title: "Test wholesale market",
              summary: "English market summary",
              body: "English market body",
              seoTitle: "Test market SEO",
              seoDescription: "Test market description",
              publishedAt,
            },
            {
              locale: "ar",
              title: "سوق الجملة التجريبي",
              summary: "ملخص السوق العربي",
              body: "محتوى السوق العربي",
              seoTitle: "عنوان السوق التجريبي",
              seoDescription: "وصف السوق التجريبي",
              publishedAt,
            },
          ],
        },
        marketPage: {
          create: {
            marketCode,
            sourceTag: "integration-market",
            products: {
              create: [
                { productId: publicProduct.id, sortOrder: 0, featured: true },
                { productId: draftProduct.id, sortOrder: 1, featured: true },
                { productId: futureProduct.id, sortOrder: 2, featured: true },
                { productId: englishOnlyProduct.id, sortOrder: 3, featured: true },
                { productId: notFeaturedProduct.id, sortOrder: 4, featured: false },
              ],
            },
          },
        },
      },
    }),
  ])
})

afterAll(async () => {
  await prisma.contentPage.deleteMany({
    where: {
      OR: [
        { slug: { startsWith: testPrefix } },
        { slug: `markets/${marketCode}` },
      ],
    },
  })
  await prisma.product.deleteMany({ where: { code: { startsWith: testPrefix } } })
  await prisma.$disconnect()
})

describe("public content queries", () => {
  it("returns only the requested translation as a serializable DTO", async () => {
    const page = await getContentPage(`${testPrefix}-published`, "ar")

    expect(page).toEqual({
      id: expect.any(String),
      slug: `${testPrefix}-published`,
      pageType: "TRUST",
      availableLocales: ["en", "ar"],
      title: "صفحة الثقة المنشورة",
      summary: "ملخص الثقة العربي",
      body: "محتوى الثقة العربي",
      seo: {
        title: "عنوان عربي لمحركات البحث",
        description: "وصف عربي لمحركات البحث",
      },
      publishedAt: publishedAt.toISOString(),
      updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    })
    expect(() => JSON.stringify(page)).not.toThrow()
  })

  it("returns null for missing, unpublished, future, or untranslated content", async () => {
    await expect(getContentPage("missing-page", "en")).resolves.toBeNull()
    await expect(getContentPage(`${testPrefix}-unpublished`, "en")).resolves.toBeNull()
    await expect(getContentPage(`${testPrefix}-en-only`, "ar")).resolves.toBeNull()
  })
})

describe("public market queries", () => {
  it("returns localized market content and public featured products in stable order", async () => {
    const market = await getMarketPage(marketCode, "en")

    expect(market).toMatchObject({
      slug: `markets/${marketCode}`,
      marketCode,
      sourceTag: "integration-market",
      title: "Test wholesale market",
    })
    expect(market?.featuredProducts.map(({ code }) => code)).toEqual([
      productCodes.public,
      productCodes.englishOnly,
    ])
    expect(() => JSON.stringify(market)).not.toThrow()
  })

  it("does not fall back when market or product translations are missing", async () => {
    const market = await getMarketPage(marketCode, "ar")

    expect(market?.title).toBe("سوق الجملة التجريبي")
    expect(market?.featuredProducts.map(({ code }) => code)).toEqual([
      productCodes.public,
    ])
    await expect(getMarketPage("missing-market", "en")).resolves.toBeNull()
  })
})
