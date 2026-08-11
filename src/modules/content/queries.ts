import type { Locale } from "@prisma/client"

import { mapPublicProductCard, type PublicProductCard } from "@/modules/catalog/queries"
import {
  findPublicContentPageRow,
  findPublicMarketPageRow,
  type PublicContentPageRow,
} from "@/modules/content/repository"

export type LocalizedContentPage = {
  id: string
  slug: string
  pageType: string
  availableLocales: Locale[]
  title: string
  summary: string | null
  body: string
  seo: {
    title: string | null
    description: string | null
  }
  publishedAt: string
  updatedAt: string
}

export type LocalizedMarketPage = LocalizedContentPage & {
  marketCode: string
  sourceTag: string | null
  featuredProducts: PublicProductCard[]
}

function mapContentPage(
  row: PublicContentPageRow,
  locale: Locale,
): LocalizedContentPage {
  const translation = row.translations.find((item) => item.locale === locale)
  if (!translation || !row.publishedAt) {
    throw new Error(`Public content ${row.slug} is missing required localized data`)
  }

  return {
    id: row.id,
    slug: row.slug,
    pageType: row.pageType,
    availableLocales: row.translations.map((item) => item.locale),
    title: translation.title,
    summary: translation.summary,
    body: translation.body,
    seo: {
      title: translation.seoTitle,
      description: translation.seoDescription,
    },
    publishedAt: row.publishedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function normalizeSlug(slug: string): string | null {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "").slice(0, 160)
  return normalized && /^[\p{L}\p{N}/_-]+$/u.test(normalized) ? normalized : null
}

export async function getContentPage(
  slug: string,
  locale: Locale,
): Promise<LocalizedContentPage | null> {
  const normalizedSlug = normalizeSlug(slug)
  if (!normalizedSlug) {
    return null
  }
  const row = await findPublicContentPageRow(normalizedSlug, locale, new Date())
  return row ? mapContentPage(row, locale) : null
}

export async function getMarketPage(
  slug: string,
  locale: Locale,
): Promise<LocalizedMarketPage | null> {
  const normalizedSlug = normalizeSlug(slug)
  if (!normalizedSlug || normalizedSlug.includes("/")) {
    return null
  }
  const row = await findPublicMarketPageRow(normalizedSlug, locale, new Date())
  if (!row) {
    return null
  }

  return {
    ...mapContentPage(row.contentPage, locale),
    marketCode: row.marketCode,
    sourceTag: row.sourceTag,
    featuredProducts: row.products.map(({ product }) => mapPublicProductCard(product)),
  }
}
