import type { MetadataRoute } from "next"

import { prisma } from "@/lib/prisma"
import { getAbsoluteSiteUrl } from "@/lib/site-url"
import { publicProductStatuses } from "@/modules/catalog/repository"
import { marketSlugs, publicContentSlugs } from "@/modules/content/config"
import { supportedLocales } from "@/modules/localization/config"

export const dynamic = "force-dynamic"

const staticRoutes = [
  "",
  "catalog",
  "stock",
  "stock-lots",
  "single-styles",
  "privacy",
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const [products, contentPages] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: { in: [...publicProductStatuses] },
        AND: [
          { publishedAt: { not: null } },
          { publishedAt: { lte: now } },
        ],
      },
      select: {
        code: true,
        updatedAt: true,
        translations: {
          where: {
            AND: [
              { publishedAt: { not: null } },
              { publishedAt: { lte: now } },
            ],
          },
          select: { locale: true },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.contentPage.findMany({
      where: {
        slug: {
          in: [
            ...publicContentSlugs,
            ...marketSlugs.map((slug) => `markets/${slug}`),
          ],
        },
        AND: [
          { publishedAt: { not: null } },
          { publishedAt: { lte: now } },
        ],
      },
      select: {
        slug: true,
        updatedAt: true,
        translations: {
          where: {
            AND: [
              { publishedAt: { not: null } },
              { publishedAt: { lte: now } },
            ],
          },
          select: { locale: true },
        },
      },
      orderBy: { slug: "asc" },
    }),
  ])

  const staticEntries = staticRoutes.flatMap((route) => {
    const languages = Object.fromEntries(
      supportedLocales.map((locale) => [
        locale,
        getAbsoluteSiteUrl(`/${locale}${route ? `/${route}` : ""}`),
      ]),
    )
    return supportedLocales.map((locale) => ({
      url: languages[locale],
      changeFrequency: route ? "weekly" as const : "daily" as const,
      priority: route ? 0.7 : 1,
      alternates: { languages },
    }))
  })

  const contentEntries = contentPages.flatMap((page) => {
    const languages = Object.fromEntries(
      page.translations.map(({ locale }) => [
        locale,
        getAbsoluteSiteUrl(`/${locale}/${page.slug}`),
      ]),
    )
    return page.translations.map(({ locale }) => ({
      url: languages[locale],
      lastModified: page.updatedAt,
      changeFrequency: "monthly" as const,
      priority: page.slug.startsWith("markets/") ? 0.8 : 0.7,
      alternates: { languages },
    }))
  })

  const productEntries = products.flatMap((product) => {
    const encodedCode = encodeURIComponent(product.code)
    const languages = Object.fromEntries(
      product.translations.map(({ locale }) => [
        locale,
        getAbsoluteSiteUrl(`/${locale}/products/${encodedCode}`),
      ]),
    )
    return product.translations.map(({ locale }) => ({
      url: languages[locale],
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages },
    }))
  })

  return [...staticEntries, ...contentEntries, ...productEntries]
}
