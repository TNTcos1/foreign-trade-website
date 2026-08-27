// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import sitemap from "@/app/sitemap"
import { prisma } from "@/lib/prisma"
import { getAbsoluteSiteUrl } from "@/lib/site-url"

const productCode = `TEST-SITEMAP-${Date.now()}`
const publishedAt = new Date("2026-01-01T00:00:00.000Z")
let contentPageId = ""
let arabicContentPublishedAt: Date | null = null

beforeAll(async () => {
  await prisma.product.create({
    data: {
      code: productCode,
      type: "STOCK_LOT",
      status: "READY_STOCK",
      category: "Test category",
      purchaseUnit: "lot",
      publishedAt,
      translations: {
        create: [
          {
            locale: "en",
            title: "Published sitemap product",
            summary: "Published English summary",
            description: "Published English description",
            publishedAt,
          },
          {
            locale: "ar",
            title: "مسودة منتج خريطة الموقع",
            summary: "ملخص عربي خاص",
            description: "وصف عربي خاص",
            publishedAt: null,
          },
        ],
      },
    },
  })

  const contentPage = await prisma.contentPage.findUniqueOrThrow({
    where: { slug: "why-us" },
    select: {
      id: true,
      translations: {
        where: { locale: "ar" },
        select: { publishedAt: true },
        take: 1,
      },
    },
  })
  contentPageId = contentPage.id
  arabicContentPublishedAt = contentPage.translations[0]?.publishedAt ?? null
})

afterAll(async () => {
  if (contentPageId) {
    await prisma.contentTranslation.update({
      where: {
        contentPageId_locale: {
          contentPageId,
          locale: "ar",
        },
      },
      data: { publishedAt: arabicContentPublishedAt },
    })
  }
  await prisma.product.deleteMany({ where: { code: productCode } })
  await prisma.$disconnect()
})

describe("public sitemap publication", () => {
  it("omits unpublished product and content translations", async () => {
    await prisma.contentTranslation.update({
      where: {
        contentPageId_locale: {
          contentPageId,
          locale: "ar",
        },
      },
      data: { publishedAt: null },
    })

    try {
      const entries = await sitemap()
      const encodedCode = encodeURIComponent(productCode)
      const productEntries = entries.filter(({ url }) =>
        url.includes(`/products/${encodedCode}`),
      )
      const contentEntries = entries.filter(({ url }) => url.endsWith("/why-us"))

      expect(productEntries).toEqual([
        expect.objectContaining({
          url: getAbsoluteSiteUrl(`/en/products/${encodedCode}`),
          alternates: {
            languages: {
              en: getAbsoluteSiteUrl(`/en/products/${encodedCode}`),
            },
          },
        }),
      ])
      expect(contentEntries).toEqual([
        expect.objectContaining({
          url: getAbsoluteSiteUrl("/en/why-us"),
          alternates: {
            languages: {
              en: getAbsoluteSiteUrl("/en/why-us"),
            },
          },
        }),
      ])
    } finally {
      await prisma.contentTranslation.update({
        where: {
          contentPageId_locale: {
            contentPageId,
            locale: "ar",
          },
        },
        data: { publishedAt: arabicContentPublishedAt },
      })
    }
  })
})
