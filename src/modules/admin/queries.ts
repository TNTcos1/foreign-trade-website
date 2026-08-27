import type { Locale, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import type {
  ContentTranslationInput,
  ProductBusinessInput,
  ProductTranslationInput,
} from "@/modules/admin/validation"
import { validateContentSlug, validateEntityId } from "@/modules/admin/validation"

export type AdminPublicationState = "MISSING" | "DRAFT" | "PUBLISHED"
export type AdminLocaleStates = Record<Locale, AdminPublicationState>

type SerializableJson = null | boolean | number | string | SerializableJson[] | {
  [key: string]: SerializableJson
}

function toIsoString(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

function toSerializableJson(value: Prisma.JsonValue | null | undefined): SerializableJson | null {
  if (value == null) {
    return null
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return value
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSerializableJson(item))
  }
  const result: Record<string, SerializableJson> = {}
  for (const [key, item] of Object.entries(value)) {
    result[key] = toSerializableJson(item)
  }
  return result
}

function productDraft(value: Prisma.JsonValue | null): ProductBusinessInput | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as unknown as ProductBusinessInput
    : null
}

function productTranslationDraft(value: Prisma.JsonValue | null): ProductTranslationInput | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as unknown as ProductTranslationInput
    : null
}

function contentTranslationDraft(value: Prisma.JsonValue | null): ContentTranslationInput | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as unknown as ContentTranslationInput
    : null
}

function productTranslationView<T extends { title: string; summary: string; description: string; seoTitle: string | null; seoDescription: string | null; shareImageAlt: string | null }>(translation: T, draftData: Prisma.JsonValue | null) {
  const draft = productTranslationDraft(draftData)
  return { ...translation, ...(draft ?? {}) }
}

function contentTranslationView<T extends { title: string; summary: string | null; body: string; seoTitle: string | null; seoDescription: string | null }>(translation: T, draftData: Prisma.JsonValue | null) {
  const draft = contentTranslationDraft(draftData)
  return { ...translation, ...(draft ?? {}) }
}

function localeStates(
  translations: Array<{ locale: Locale; publishedAt: Date | null }>,
): AdminLocaleStates {
  const states: AdminLocaleStates = { en: "MISSING", ar: "MISSING" }
  for (const translation of translations) {
    states[translation.locale] = translation.publishedAt ? "PUBLISHED" : "DRAFT"
  }
  return states
}

export async function listAdminProducts() {
  const products = await prisma.product.findMany({
    orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      type: true,
      status: true,
      category: true,
      availableQuantity: true,
      draftData: true,
      publishedAt: true,
      archivedAt: true,
      updatedAt: true,
      translations: {
        orderBy: { locale: "asc" },
        select: { locale: true, title: true, publishedAt: true, draftData: true },
      },
      media: {
        where: { isPrimary: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { id: true, url: true, altText: true },
      },
    },
  })

  return products.map((product) => {
    const draft = productDraft(product.draftData)
    return {
      id: product.id,
      code: product.code,
      type: draft?.type ?? product.type,
      status: draft?.status ?? product.status,
      category: draft?.category ?? product.category,
      availableQuantity: draft?.availableQuantity ?? product.availableQuantity,
      publishedAt: toIsoString(product.publishedAt),
      archivedAt: toIsoString(product.archivedAt),
      updatedAt: product.updatedAt.toISOString(),
      hasDraftChanges: Boolean(product.draftData),
      translations: product.translations.map((translation) => {
        const draft = productTranslationDraft(translation.draftData)
        return {
          locale: translation.locale,
          title: draft?.title ?? translation.title,
          publishedAt: toIsoString(translation.publishedAt),
          hasDraftChanges: Boolean(draft),
        }
      }),
      localeStates: localeStates(product.translations),
      primaryMedia: product.media[0] ?? null,
    }
  })
}

export async function getAdminProduct(productId: string) {
  productId = validateEntityId(productId)
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      translations: { orderBy: { locale: "asc" } },
      media: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      stockLotDetails: true,
      singleStyleDetails: true,
      variants: { orderBy: [{ color: "asc" }, { size: "asc" }, { sku: "asc" }] },
    },
  })
  if (!product) {
    return null
  }

  const productDraftValue = productDraft(product.draftData)

  return {
    id: product.id,
    code: product.code,
    type: productDraftValue?.type ?? product.type,
    status: productDraftValue?.status ?? product.status,
    hasDraftChanges: Boolean(productDraftValue),
    ...(() => {
      const draft = productDraftValue
      return {
        category: draft?.category ?? product.category,
        genderAge: draft?.genderAge ?? product.genderAge,
        season: draft?.season ?? product.season,
        tags: [...(draft?.tags ?? product.tags)],
        sourceType: draft?.sourceType ?? product.sourceType,
        sourceLocation: draft?.sourceLocation ?? product.sourceLocation,
        qualityGrade: draft?.qualityGrade ?? product.qualityGrade,
        clearanceReason: draft?.clearanceReason ?? product.clearanceReason,
        defectNotes: draft?.defectNotes ?? product.defectNotes,
        inspectionAvailable: draft?.inspectionAvailable ?? product.inspectionAvailable,
        purchaseUnit: draft?.purchaseUnit ?? product.purchaseUnit,
        minimumOrderQuantity: draft?.minimumOrderQuantity ?? product.minimumOrderQuantity,
        tradeTerms: draft?.tradeTerms ?? product.tradeTerms,
        currency: draft?.currency ?? product.currency,
        referencePriceMin: draft?.referencePriceMin ?? product.referencePriceMin?.toString() ?? null,
        referencePriceMax: draft?.referencePriceMax ?? product.referencePriceMax?.toString() ?? null,
        priceBasis: draft?.priceBasis ?? product.priceBasis,
        availableQuantity: draft?.availableQuantity ?? product.availableQuantity,
      }
    })(),
    lastVerifiedAt: toIsoString(product.lastVerifiedAt),
    publishedAt: toIsoString(product.publishedAt),
    archivedAt: toIsoString(product.archivedAt),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    createdById: product.createdById,
    updatedById: product.updatedById,
    localeStates: localeStates(product.translations),
    translations: product.translations.map((translation) => {
      const view = productTranslationView(translation, translation.draftData)
      return {
        id: translation.id,
        locale: translation.locale,
        title: view.title,
        summary: view.summary,
        description: view.description,
        seoTitle: view.seoTitle,
        seoDescription: view.seoDescription,
        shareImageAlt: view.shareImageAlt,
        publishedAt: toIsoString(translation.publishedAt),
        hasDraftChanges: Boolean(translation.draftData),
        createdAt: translation.createdAt.toISOString(),
        updatedAt: translation.updatedAt.toISOString(),
      }
    }),
    media: product.media.map((media) => ({
      id: media.id,
      mediaType: media.mediaType,
      url: media.url,
      altText: media.altText,
      metadata: toSerializableJson(media.metadata),
      sortOrder: media.sortOrder,
      isPrimary: media.isPrimary,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    })),
    stockLotDetails: productDraftValue?.stockLotDetails
      ? {
          totalPieces: productDraftValue.stockLotDetails.totalPieces,
          totalPackages: productDraftValue.stockLotDetails.totalPackages,
          totalWeightKg: productDraftValue.stockLotDetails.totalWeightKg,
          totalVolumeCbm: productDraftValue.stockLotDetails.totalVolumeCbm,
          sizeRange: productDraftValue.stockLotDetails.sizeRange,
          piecesPerPackage: productDraftValue.stockLotDetails.piecesPerPackage,
        }
      : product.stockLotDetails
        ? {
            totalPieces: product.stockLotDetails.totalPieces,
            totalPackages: product.stockLotDetails.totalPackages,
            totalWeightKg: product.stockLotDetails.totalWeightKg?.toString() ?? null,
            totalVolumeCbm: product.stockLotDetails.totalVolumeCbm?.toString() ?? null,
            categoryComposition: toSerializableJson(product.stockLotDetails.categoryComposition),
            sizeRange: product.stockLotDetails.sizeRange,
            piecesPerPackage: product.stockLotDetails.piecesPerPackage,
            containerLoadEstimate: toSerializableJson(product.stockLotDetails.containerLoadEstimate),
          }
        : null,
    singleStyleDetails: productDraftValue?.singleStyleDetails
      ? { ...productDraftValue.singleStyleDetails }
      : product.singleStyleDetails ? { ...product.singleStyleDetails } : null,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      availableQuantity: variant.availableQuantity,
      createdAt: variant.createdAt.toISOString(),
      updatedAt: variant.updatedAt.toISOString(),
    })),
  }
}

export async function listAdminContentPages() {
  const pages = await prisma.contentPage.findMany({
    orderBy: [{ updatedAt: "desc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      pageType: true,
      publishedAt: true,
      updatedAt: true,
      translations: {
        orderBy: { locale: "asc" },
        select: { locale: true, title: true, publishedAt: true, draftData: true },
      },
    },
  })

  return pages.map((page) => ({
    id: page.id,
    slug: page.slug,
    pageType: page.pageType,
    publishedAt: toIsoString(page.publishedAt),
    updatedAt: page.updatedAt.toISOString(),
    translations: page.translations.map((translation) => {
      const draft = contentTranslationDraft(translation.draftData)
      return {
        locale: translation.locale,
        title: draft?.title ?? translation.title,
        publishedAt: toIsoString(translation.publishedAt),
        hasDraftChanges: Boolean(draft),
      }
    }),
    localeStates: localeStates(page.translations),
  }))
}

export async function getAdminContentPage(slug: string) {
  slug = validateContentSlug(slug)
  const page = await prisma.contentPage.findUnique({
    where: { slug },
    include: {
      translations: { orderBy: { locale: "asc" } },
      marketPage: true,
    },
  })
  if (!page) {
    return null
  }

  return {
    id: page.id,
    slug: page.slug,
    pageType: page.pageType,
    publishedAt: toIsoString(page.publishedAt),
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
    createdById: page.createdById,
    updatedById: page.updatedById,
    localeStates: localeStates(page.translations),
    translations: page.translations.map((translation) => {
      const view = contentTranslationView(translation, translation.draftData)
      return {
        id: translation.id,
        locale: translation.locale,
        title: view.title,
        summary: view.summary,
        body: view.body,
        seoTitle: view.seoTitle,
        seoDescription: view.seoDescription,
        publishedAt: toIsoString(translation.publishedAt),
        hasDraftChanges: Boolean(translation.draftData),
        createdAt: translation.createdAt.toISOString(),
        updatedAt: translation.updatedAt.toISOString(),
      }
    }),
    marketPage: page.marketPage
      ? {
          id: page.marketPage.id,
          marketCode: page.marketPage.marketCode,
          sourceTag: page.marketPage.sourceTag,
        }
      : null,
  }
}
