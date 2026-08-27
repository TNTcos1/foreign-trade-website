import type { Locale, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { publicProductStatuses } from "@/modules/catalog/repository"

function publishedProductTranslationWhere(
  locale: Locale,
  now: Date,
): Prisma.ProductTranslationWhereInput {
  return {
    locale,
    AND: [
      { publishedAt: { not: null } },
      { publishedAt: { lte: now } },
    ],
  }
}

function publishedContentTranslationWhere(
  locale: Locale | undefined,
  now: Date,
): Prisma.ContentTranslationWhereInput {
  return {
    ...(locale ? { locale } : {}),
    AND: [
      { publishedAt: { not: null } },
      { publishedAt: { lte: now } },
    ],
  }
}

function contentVisibilityWhere(
  slug: string,
  locale: Locale,
  now: Date,
): Prisma.ContentPageWhereInput {
  return {
    slug,
    AND: [
      { publishedAt: { not: null } },
      { publishedAt: { lte: now } },
    ],
    translations: { some: publishedContentTranslationWhere(locale, now) },
  }
}

const localizedContentSelect = (now: Date) => ({
  id: true,
  slug: true,
  pageType: true,
  publishedAt: true,
  updatedAt: true,
  translations: {
    where: publishedContentTranslationWhere(undefined, now),
    orderBy: { locale: "asc" as const },
    select: {
      locale: true,
      title: true,
      summary: true,
      body: true,
      seoTitle: true,
      seoDescription: true,
    },
  },
}) satisfies Prisma.ContentPageSelect

export async function findPublicContentPageRow(
  slug: string,
  locale: Locale,
  now: Date,
) {
  return prisma.contentPage.findFirst({
    where: contentVisibilityWhere(slug, locale, now),
    select: localizedContentSelect(now),
  })
}

export type PublicContentPageRow = NonNullable<
  Awaited<ReturnType<typeof findPublicContentPageRow>>
>

const marketProductSelect = (locale: Locale, now: Date) => ({
  id: true,
  code: true,
  type: true,
  status: true,
  category: true,
  purchaseUnit: true,
  minimumOrderQuantity: true,
  currency: true,
  referencePriceMin: true,
  referencePriceMax: true,
  priceBasis: true,
  availableQuantity: true,
  lastVerifiedAt: true,
  publishedAt: true,
  translations: {
    where: publishedProductTranslationWhere(locale, now),
    take: 1,
    select: {
      title: true,
      summary: true,
      shareImageAlt: true,
    },
  },
  media: {
    where: { isPrimary: true },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: {
      id: true,
      mediaType: true,
      url: true,
      altText: true,
      sortOrder: true,
      isPrimary: true,
    },
  },
  stockLotDetails: {
    select: {
      totalPieces: true,
      totalPackages: true,
      piecesPerPackage: true,
    },
  },
  singleStyleDetails: {
    select: {
      piecesPerCarton: true,
      factoryLeadTimeDays: true,
    },
  },
}) satisfies Prisma.ProductSelect

export async function findPublicMarketPageRow(
  marketCode: string,
  locale: Locale,
  now: Date,
) {
  return prisma.marketPage.findFirst({
    where: {
      marketCode,
      contentPage: contentVisibilityWhere(`markets/${marketCode}`, locale, now),
    },
    select: {
      marketCode: true,
      sourceTag: true,
      contentPage: {
        select: localizedContentSelect(now),
      },
      products: {
        where: {
          featured: true,
          product: {
            status: { in: [...publicProductStatuses] },
            AND: [
              { publishedAt: { not: null } },
              { publishedAt: { lte: now } },
            ],
            translations: { some: publishedProductTranslationWhere(locale, now) },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { product: { code: "asc" } }],
        select: {
          product: {
            select: marketProductSelect(locale, now),
          },
        },
      },
    },
  })
}

export type PublicMarketPageRow = NonNullable<
  Awaited<ReturnType<typeof findPublicMarketPageRow>>
>
