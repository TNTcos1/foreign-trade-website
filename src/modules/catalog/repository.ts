import type { Locale, Prisma, ProductStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { CATALOG_PAGE_SIZE, type CatalogFilters } from "@/modules/catalog/filters"

export const publicProductStatuses = ["READY_STOCK", "FACTORY_BOOKING", "SOLD_OUT"] as const satisfies readonly ProductStatus[]

function publishedTranslationWhere(
  locale: Locale | undefined,
  now: Date,
): Prisma.ProductTranslationWhereInput {
  return {
    ...(locale ? { locale } : {}),
    AND: [
      { publishedAt: { not: null } },
      { publishedAt: { lte: now } },
    ],
  }
}

function publicVisibilityWhere(locale: Locale, now: Date): Prisma.ProductWhereInput {
  return {
    status: { in: [...publicProductStatuses] },
    AND: [
      { publishedAt: { not: null } },
      { publishedAt: { lte: now } },
    ],
    translations: { some: publishedTranslationWhere(locale, now) },
  }
}

export function buildPublicProductWhere(
  filters: CatalogFilters,
  locale: Locale,
  now: Date,
): Prisma.ProductWhereInput {
  const conditions: Prisma.ProductWhereInput[] = []

  if (filters.search) {
    conditions.push({
      OR: [
        { code: { contains: filters.search, mode: "insensitive" } },
        {
          translations: {
            some: {
              locale,
              OR: [
                { title: { contains: filters.search, mode: "insensitive" } },
                { summary: { contains: filters.search, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    })
  }

  if (filters.category) {
    conditions.push({ category: { equals: filters.category, mode: "insensitive" } })
  }
  if (filters.genderAge) {
    conditions.push({ genderAge: { equals: filters.genderAge, mode: "insensitive" } })
  }
  if (filters.season) {
    conditions.push({ season: { equals: filters.season, mode: "insensitive" } })
  }
  if (filters.purchaseUnit) {
    conditions.push({ purchaseUnit: { equals: filters.purchaseUnit, mode: "insensitive" } })
  }
  if (filters.minMoq !== undefined) {
    conditions.push({ minimumOrderQuantity: { gte: filters.minMoq } })
  }
  if (filters.maxMoq !== undefined) {
    conditions.push({ minimumOrderQuantity: { lte: filters.maxMoq } })
  }
  if (filters.minPrice !== undefined) {
    conditions.push({
      OR: [
        { referencePriceMax: { gte: filters.minPrice } },
        { referencePriceMax: null, referencePriceMin: { gte: filters.minPrice } },
      ],
    })
  }
  if (filters.maxPrice !== undefined) {
    conditions.push({ referencePriceMin: { lte: filters.maxPrice } })
  }

  return {
    ...publicVisibilityWhere(locale, now),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    AND: [
      { publishedAt: { not: null } },
      { publishedAt: { lte: now } },
      ...conditions,
    ],
  }
}

export function buildCatalogOrderBy(sort: CatalogFilters["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "PRICE_ASC":
      return [
        { referencePriceMin: { sort: "asc", nulls: "last" } },
        { publishedAt: "desc" },
        { code: "asc" },
      ]
    case "PRICE_DESC":
      return [
        { referencePriceMin: { sort: "desc", nulls: "last" } },
        { publishedAt: "desc" },
        { code: "asc" },
      ]
    case "MOQ_ASC":
      return [
        { minimumOrderQuantity: { sort: "asc", nulls: "last" } },
        { publishedAt: "desc" },
        { code: "asc" },
      ]
    case "LATEST":
      return [{ publishedAt: "desc" }, { createdAt: "desc" }, { code: "asc" }]
  }
}

function cardSelect(locale: Locale, now: Date) {
  return {
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
      where: publishedTranslationWhere(locale, now),
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
  } satisfies Prisma.ProductSelect
}

export async function findPublicProductRows(filters: CatalogFilters, locale: Locale, now: Date) {
  const where = buildPublicProductWhere(filters, locale, now)
  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: buildCatalogOrderBy(filters.sort),
      skip: (filters.page - 1) * CATALOG_PAGE_SIZE,
      take: CATALOG_PAGE_SIZE,
      select: cardSelect(locale, now),
    }),
    prisma.product.count({ where }),
  ])

  return { rows, total }
}

export type CatalogProductRow = Awaited<ReturnType<typeof findPublicProductRows>>["rows"][number]

function detailSelect(now: Date) {
  return {
    id: true,
    code: true,
    type: true,
    status: true,
    category: true,
    genderAge: true,
    season: true,
    tags: true,
    sourceType: true,
    sourceLocation: true,
    qualityGrade: true,
    clearanceReason: true,
    defectNotes: true,
    inspectionAvailable: true,
    purchaseUnit: true,
    minimumOrderQuantity: true,
    tradeTerms: true,
    currency: true,
    referencePriceMin: true,
    referencePriceMax: true,
    priceBasis: true,
    availableQuantity: true,
    lastVerifiedAt: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
    translations: {
      where: publishedTranslationWhere(undefined, now),
      orderBy: { locale: "asc" as const },
      select: {
        locale: true,
        title: true,
        summary: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        shareImageAlt: true,
      },
    },
    media: {
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      select: {
        id: true,
        mediaType: true,
        url: true,
        altText: true,
        metadata: true,
        sortOrder: true,
        isPrimary: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    stockLotDetails: {
      select: {
        totalPieces: true,
        totalPackages: true,
        totalWeightKg: true,
        totalVolumeCbm: true,
        categoryComposition: true,
        sizeRange: true,
        piecesPerPackage: true,
        containerLoadEstimate: true,
      },
    },
    singleStyleDetails: {
      select: {
        styleNumber: true,
        fabric: true,
        styleNotes: true,
        piecesPerCarton: true,
        factoryLeadTimeDays: true,
      },
    },
    variants: {
      orderBy: [{ color: "asc" as const }, { size: "asc" as const }, { sku: "asc" as const }],
      select: {
        id: true,
        sku: true,
        color: true,
        size: true,
        availableQuantity: true,
      },
    },
  } satisfies Prisma.ProductSelect
}

export async function findPublicProductByCodeRow(code: string, locale: Locale, now: Date) {
  return prisma.product.findFirst({
    where: {
      code,
      ...publicVisibilityWhere(locale, now),
    },
    select: detailSelect(now),
  })
}

export type PublicProductRow = NonNullable<Awaited<ReturnType<typeof findPublicProductByCodeRow>>>

export async function findRelatedPublicProductRows(
  productId: string,
  locale: Locale,
  now: Date,
  limit = 3,
): Promise<CatalogProductRow[]> {
  return prisma.product.findMany({
    where: {
      ...publicVisibilityWhere(locale, now),
      id: { not: productId },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }, { code: "asc" }],
    take: Math.max(0, Math.min(limit, 3)),
    select: cardSelect(locale, now),
  })
}
