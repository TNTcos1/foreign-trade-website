import type { Locale, ProductStatus, ProductType } from "@prisma/client"
import { getAbsoluteSiteUrl, getPublicMediaUrl } from "@/lib/site-url"
import { canAddToInquiry, formatPriceVisibility, type PriceVisibility } from "@/modules/catalog/domain"
import { CATALOG_PAGE_SIZE, type CatalogFilters } from "@/modules/catalog/filters"
import {
  findPublicProductByCodeRow,
  findPublicProductRows,
  findRelatedPublicProductRows,
  type CatalogProductRow,
  type PublicProductRow,
} from "@/modules/catalog/repository"
import {
  projectPublicMediaMetadata,
  type PublicMediaMetadata,
} from "@/modules/media/metadata"

export type SerializableJson = null | boolean | number | string | SerializableJson[] | { [key: string]: SerializableJson }

export type PublicProductMedia = {
  id: string
  mediaType: string
  url: string
  alt: string | null
  metadata: PublicMediaMetadata | null
  sortOrder: number
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export type PublicProductCard = {
  id: string
  code: string
  title: string
  summary: string
  type: ProductType
  status: ProductStatus
  category: string
  primaryMedia: {
    id: string
    mediaType: string
    url: string
    alt: string | null
    sortOrder: number
    isPrimary: boolean
  } | null
  quantitySummary: {
    availableQuantity: number | null
    totalPieces: number | null
    totalPackages: number | null
    piecesPerPackage: number | null
    piecesPerCarton: number | null
    factoryLeadTimeDays: number | null
  }
  purchaseUnit: string
  minimumOrderQuantity: number | null
  lastVerifiedAt: string | null
  publishedAt: string
  priceVisibility: PriceVisibility
  canAddToInquiry: boolean
}

export type PaginatedProductCards = {
  items: PublicProductCard[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type PublicProduct = {
  id: string
  code: string
  availableLocales: Locale[]
  title: string
  summary: string
  description: string
  seo: {
    title: string | null
    description: string | null
    shareImageAlt: string | null
  }
  type: ProductType
  status: ProductStatus
  category: string
  genderAge: string | null
  season: string | null
  tags: string[]
  sourceType: string | null
  sourceLocation: string | null
  qualityGrade: string | null
  clearanceReason: string | null
  defectNotes: string | null
  inspectionAvailable: boolean
  purchaseUnit: string
  minimumOrderQuantity: number | null
  tradeTerms: string | null
  availableQuantity: number | null
  lastVerifiedAt: string | null
  publishedAt: string
  createdAt: string
  updatedAt: string
  priceVisibility: PriceVisibility
  canAddToInquiry: boolean
  media: PublicProductMedia[]
  stockLotDetails: {
    totalPieces: number
    totalPackages: number | null
    totalWeightKg: string | null
    totalVolumeCbm: string | null
    categoryComposition: SerializableJson | null
    sizeRange: string | null
    piecesPerPackage: number | null
    containerLoadEstimate: SerializableJson | null
  } | null
  singleStyleDetails: {
    styleNumber: string
    fabric: string | null
    styleNotes: string | null
    piecesPerCarton: number | null
    factoryLeadTimeDays: number | null
  } | null
  variants: Array<{
    id: string
    sku: string
    color: string
    size: string
    availableQuantity: number
  }>
  relatedProducts: PublicProductCard[]
}

function toIsoString(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

function requirePublishedAt(value: Date | null, code: string): string {
  if (!value) {
    throw new Error(`Public product ${code} is missing its publication date`)
  }
  return value.toISOString()
}

function toSerializableJson(value: unknown): SerializableJson | null {
  if (value === null) {
    return null
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return value
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (Array.isArray(value)) {
    return value.map(toSerializableJson)
  }
  if (typeof value === "object") {
    const result: { [key: string]: SerializableJson } = {}
    for (const [key, child] of Object.entries(value)) {
      result[key] = toSerializableJson(child)
    }
    return result
  }
  return null
}

export function mapPublicProductCard(row: CatalogProductRow): PublicProductCard {
  const translation = row.translations[0]
  if (!translation) {
    throw new Error(`Public product ${row.code} is missing its requested translation`)
  }

  const primaryMedia = row.media[0]

  return {
    id: row.id,
    code: row.code,
    title: translation.title,
    summary: translation.summary,
    type: row.type,
    status: row.status,
    category: row.category,
    primaryMedia: primaryMedia
      ? {
          id: primaryMedia.id,
          mediaType: primaryMedia.mediaType,
          url: primaryMedia.url,
          alt: translation.shareImageAlt ?? primaryMedia.altText,
          sortOrder: primaryMedia.sortOrder,
          isPrimary: primaryMedia.isPrimary,
        }
      : null,
    quantitySummary: {
      availableQuantity: row.availableQuantity,
      totalPieces: row.stockLotDetails?.totalPieces ?? null,
      totalPackages: row.stockLotDetails?.totalPackages ?? null,
      piecesPerPackage: row.stockLotDetails?.piecesPerPackage ?? null,
      piecesPerCarton: row.singleStyleDetails?.piecesPerCarton ?? null,
      factoryLeadTimeDays: row.singleStyleDetails?.factoryLeadTimeDays ?? null,
    },
    purchaseUnit: row.purchaseUnit,
    minimumOrderQuantity: row.minimumOrderQuantity,
    lastVerifiedAt: toIsoString(row.lastVerifiedAt),
    publishedAt: requirePublishedAt(row.publishedAt, row.code),
    priceVisibility: formatPriceVisibility(row),
    canAddToInquiry: canAddToInquiry(row.status),
  }
}

function mapPublicProduct(
  row: PublicProductRow,
  relatedRows: CatalogProductRow[],
  locale: Locale,
): PublicProduct {
  const translation = row.translations.find((item) => item.locale === locale)
  if (!translation) {
    throw new Error(`Public product ${row.code} is missing its requested translation`)
  }

  return {
    id: row.id,
    code: row.code,
    availableLocales: row.translations.map((item) => item.locale),
    title: translation.title,
    summary: translation.summary,
    description: translation.description,
    seo: {
      title: translation.seoTitle,
      description: translation.seoDescription,
      shareImageAlt: translation.shareImageAlt,
    },
    type: row.type,
    status: row.status,
    category: row.category,
    genderAge: row.genderAge,
    season: row.season,
    tags: [...row.tags],
    sourceType: row.sourceType,
    sourceLocation: row.sourceLocation,
    qualityGrade: row.qualityGrade,
    clearanceReason: row.clearanceReason,
    defectNotes: row.defectNotes,
    inspectionAvailable: row.inspectionAvailable,
    purchaseUnit: row.purchaseUnit,
    minimumOrderQuantity: row.minimumOrderQuantity,
    tradeTerms: row.tradeTerms,
    availableQuantity: row.availableQuantity,
    lastVerifiedAt: toIsoString(row.lastVerifiedAt),
    publishedAt: requirePublishedAt(row.publishedAt, row.code),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    priceVisibility: formatPriceVisibility(row),
    canAddToInquiry: canAddToInquiry(row.status),
    media: row.media.map((media) => ({
      id: media.id,
      mediaType: media.mediaType,
      url: media.url,
      alt: translation.shareImageAlt ?? media.altText,
      metadata: projectPublicMediaMetadata(media.metadata),
      sortOrder: media.sortOrder,
      isPrimary: media.isPrimary,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    })),
    stockLotDetails: row.stockLotDetails
      ? {
          totalPieces: row.stockLotDetails.totalPieces,
          totalPackages: row.stockLotDetails.totalPackages,
          totalWeightKg: row.stockLotDetails.totalWeightKg?.toString() ?? null,
          totalVolumeCbm: row.stockLotDetails.totalVolumeCbm?.toString() ?? null,
          categoryComposition: toSerializableJson(row.stockLotDetails.categoryComposition),
          sizeRange: row.stockLotDetails.sizeRange,
          piecesPerPackage: row.stockLotDetails.piecesPerPackage,
          containerLoadEstimate: toSerializableJson(row.stockLotDetails.containerLoadEstimate),
        }
      : null,
    singleStyleDetails: row.singleStyleDetails ? { ...row.singleStyleDetails } : null,
    variants: row.variants.map((variant) => ({ ...variant })),
    relatedProducts: relatedRows.map(mapPublicProductCard),
  }
}

export async function listPublicProducts(filters: CatalogFilters, locale: Locale): Promise<PaginatedProductCards> {
  const now = new Date()
  const { rows, total } = await findPublicProductRows(filters, locale, now)

  return {
    items: rows.map(mapPublicProductCard),
    page: filters.page,
    pageSize: CATALOG_PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / CATALOG_PAGE_SIZE),
  }
}

export async function getPublicProductByCode(code: string, locale: Locale): Promise<PublicProduct | null> {
  const normalizedCode = code.trim().slice(0, 120)
  if (!normalizedCode) {
    return null
  }

  const now = new Date()
  const row = await findPublicProductByCodeRow(normalizedCode, locale, now)
  if (!row) {
    return null
  }

  const relatedRows = await findRelatedPublicProductRows(row.id, locale, now)
  return mapPublicProduct(row, relatedRows, locale)
}

function availabilityForStatus(status: ProductStatus): string {
  if (status === "SOLD_OUT") {
    return "https://schema.org/OutOfStock"
  }
  if (status === "FACTORY_BOOKING") {
    return "https://schema.org/PreOrder"
  }
  return "https://schema.org/InStock"
}

export function createProductJsonLd(product: PublicProduct, locale: Locale): { [key: string]: SerializableJson } {
  const productUrl = getAbsoluteSiteUrl(`/${locale}/products/${encodeURIComponent(product.code)}`)
  const images = product.media
    .filter(
      (media) =>
        media.mediaType === "IMAGE" && !media.url.startsWith("/seed-media/"),
    )
    .map((media) => getPublicMediaUrl(media.url))
    .filter((url): url is string => url !== null)

  const result: { [key: string]: SerializableJson } = {
    "@context": "https://schema.org",
    "@type": "Product",
    sku: product.code,
    name: product.title,
    description: product.description,
    url: productUrl,
    availability: availabilityForStatus(product.status),
  }

  if (images.length > 0) {
    result.image = images
  }

  if (product.priceVisibility.kind === "REFERENCE_PRICE") {
    const price = product.priceVisibility
    const commonOfferFields: { [key: string]: SerializableJson } = {
      priceCurrency: price.currency,
      availability: availabilityForStatus(product.status),
      url: productUrl,
    }

    result.offers = price.minimum === price.maximum
      ? {
          "@type": "Offer",
          ...commonOfferFields,
          price: price.minimum,
        }
      : {
          "@type": "AggregateOffer",
          ...commonOfferFields,
          lowPrice: price.minimum,
          highPrice: price.maximum,
        }
  }

  return result
}
