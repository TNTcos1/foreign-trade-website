import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import {
  AdminServiceError,
  type ProductBusinessInput,
  type ProductTranslationInput,
  validateEntityId,
  validateLocale,
  validateProductBusinessFields,
  validateProductCode,
  validateProductDraft,
  validateProductTranslation,
} from "@/modules/admin/validation"

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

function inputJson(value: Prisma.JsonValue | null): Prisma.InputJsonValue | undefined {
  return value === null ? undefined : value as Prisma.InputJsonValue
}

function productBusinessJson(data: ProductBusinessInput): Prisma.InputJsonObject {
  return data as unknown as Prisma.InputJsonObject
}

function productTranslationJson(data: ProductTranslationInput): Prisma.InputJsonObject {
  return data as unknown as Prisma.InputJsonObject
}

function productFields(data: ProductBusinessInput) {
  return {
    type: data.type,
    status: data.status,
    category: data.category,
    genderAge: data.genderAge,
    season: data.season,
    tags: data.tags,
    sourceType: data.sourceType,
    sourceLocation: data.sourceLocation,
    qualityGrade: data.qualityGrade,
    clearanceReason: data.clearanceReason,
    defectNotes: data.defectNotes,
    inspectionAvailable: data.inspectionAvailable,
    purchaseUnit: data.purchaseUnit,
    minimumOrderQuantity: data.minimumOrderQuantity,
    tradeTerms: data.tradeTerms,
    currency: data.currency,
    referencePriceMin: data.referencePriceMin,
    referencePriceMax: data.referencePriceMax,
    priceBasis: data.priceBasis,
    availableQuantity: data.availableQuantity,
  }
}

function productDraft(value: Prisma.JsonValue | null): ProductBusinessInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return validateProductBusinessFields(value)
}

function translationDraft(value: Prisma.JsonValue | null): ProductTranslationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return validateProductTranslation(value)
}

export async function createProductDraft(input: unknown, actorId: string) {
  const data = validateProductDraft(input)
  try {
    return await prisma.$transaction((tx) => tx.product.create({
      data: {
        code: data.code,
        type: data.type,
        status: data.status,
        category: data.category,
        genderAge: data.genderAge,
        season: data.season,
        tags: data.tags,
        sourceType: data.sourceType,
        sourceLocation: data.sourceLocation,
        qualityGrade: data.qualityGrade,
        clearanceReason: data.clearanceReason,
        defectNotes: data.defectNotes,
        inspectionAvailable: data.inspectionAvailable,
        purchaseUnit: data.purchaseUnit,
        minimumOrderQuantity: data.minimumOrderQuantity,
        tradeTerms: data.tradeTerms,
        currency: data.currency,
        referencePriceMin: data.referencePriceMin,
        referencePriceMax: data.referencePriceMax,
        priceBasis: data.priceBasis,
        availableQuantity: data.availableQuantity,
        createdById: actorId,
        updatedById: actorId,
        translations: {
          create: {
            locale: "en",
            ...data.translation,
          },
        },
        stockLotDetails: data.stockLotDetails
          ? { create: data.stockLotDetails }
          : undefined,
        singleStyleDetails: data.singleStyleDetails
          ? { create: data.singleStyleDetails }
          : undefined,
      },
      include: {
        translations: true,
        stockLotDetails: true,
        singleStyleDetails: true,
      },
    }))
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AdminServiceError("PRODUCT_CODE_EXISTS")
    }
    throw error
  }
}

export async function updateProductDraft(
  productId: string,
  input: unknown,
  actorId: string,
) {
  productId = validateEntityId(productId)
  const data = validateProductBusinessFields(input)
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, archivedAt: true, publishedAt: true },
    })
    if (!product) {
      throw new AdminServiceError("PRODUCT_NOT_FOUND")
    }
    if (product.archivedAt) {
      throw new AdminServiceError("PRODUCT_ARCHIVED")
    }

    if (product.publishedAt) {
      const draft = {
        ...productFields(data),
        stockLotDetails: data.stockLotDetails,
        singleStyleDetails: data.singleStyleDetails,
      }
      const saved = await tx.product.update({
        where: { id: productId },
        data: { draftData: productBusinessJson(draft), updatedById: actorId },
        include: { stockLotDetails: true, singleStyleDetails: true },
      })
      return {
        ...saved,
        ...productFields(data),
        stockLotDetails: data.stockLotDetails,
        singleStyleDetails: data.singleStyleDetails,
        hasDraftChanges: true,
      }
    }

    await tx.stockLotDetails.deleteMany({ where: { productId } })
    await tx.singleStyleDetails.deleteMany({ where: { productId } })

    return tx.product.update({
      where: { id: productId },
      data: {
        ...productFields(data),
        draftData: Prisma.DbNull,
        updatedById: actorId,
        stockLotDetails: data.stockLotDetails
          ? { create: data.stockLotDetails }
          : undefined,
        singleStyleDetails: data.singleStyleDetails
          ? { create: data.singleStyleDetails }
          : undefined,
      },
      include: {
        stockLotDetails: true,
        singleStyleDetails: true,
      },
    })
  })
}

export async function saveProductTranslation(
  productId: string,
  localeValue: unknown,
  input: unknown,
  actorId: string,
) {
  productId = validateEntityId(productId)
  const locale = validateLocale(localeValue)
  const translation = validateProductTranslation(input)
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, archivedAt: true, publishedAt: true },
    })
    if (!product) {
      throw new AdminServiceError("PRODUCT_NOT_FOUND")
    }
    if (product.archivedAt) {
      throw new AdminServiceError("PRODUCT_ARCHIVED")
    }
    const existing = await tx.productTranslation.findUnique({
      where: { productId_locale: { productId, locale } },
      select: { id: true, publishedAt: true },
    })
    const saved = existing?.publishedAt
      ? await tx.productTranslation.update({
          where: { id: existing.id },
          data: { draftData: productTranslationJson(translation) },
        })
      : await tx.productTranslation.upsert({
          where: { productId_locale: { productId, locale } },
          update: { ...translation, draftData: Prisma.DbNull },
          create: { productId, locale, ...translation },
        })
    await tx.product.update({
      where: { id: productId },
      data: { updatedById: actorId },
    })
    return {
      ...saved,
      ...translation,
      ...(existing?.publishedAt ? { publishedAt: existing.publishedAt, draftData: productTranslationJson(translation) } : {}),
      hasDraftChanges: Boolean(existing?.publishedAt),
    }
  })
}

export async function publishProductLocale(
  productId: string,
  localeValue: unknown,
  actorId: string,
) {
  productId = validateEntityId(productId)
  const locale = validateLocale(localeValue)
  const now = new Date()
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        archivedAt: true,
        draftData: true,
        translations: {
          where: { locale: { in: locale === "ar" ? ["en", "ar"] : ["en"] } },
          select: { id: true, locale: true, publishedAt: true, draftData: true },
        },
      },
    })
    if (!product) {
      throw new AdminServiceError("PRODUCT_NOT_FOUND")
    }
    if (product.archivedAt || product.status === "ARCHIVED") {
      throw new AdminServiceError("PRODUCT_ARCHIVED")
    }
    if (product.status === "DRAFT") {
      throw new AdminServiceError("PRODUCT_NOT_READY")
    }
    const requested = product.translations.find(({ locale: candidate }) => candidate === locale)
    if (!requested) {
      throw new AdminServiceError("TRANSLATION_NOT_FOUND")
    }
    if (locale === "ar") {
      const english = product.translations.find(({ locale: candidate }) => candidate === "en")
      if (!english?.publishedAt || english.publishedAt > now) {
        throw new AdminServiceError("ENGLISH_PUBLICATION_REQUIRED")
      }
    }
    const draftTranslation = translationDraft(requested.draftData)
    const draftProduct = locale === "en" ? productDraft(product.draftData) : null
    if (draftProduct) {
      await tx.stockLotDetails.deleteMany({ where: { productId } })
      await tx.singleStyleDetails.deleteMany({ where: { productId } })
    }
    const translation = await tx.productTranslation.update({
      where: { id: requested.id },
      data: {
        ...(draftTranslation ?? {}),
        publishedAt: now,
        draftData: Prisma.DbNull,
      },
    })
    await tx.product.update({
      where: { id: productId },
      data: {
        ...(draftProduct ? productFields(draftProduct) : {}),
        ...(locale === "en" ? { draftData: Prisma.DbNull } : {}),
        publishedAt: product.publishedAt ?? now,
        updatedById: actorId,
        ...(draftProduct?.stockLotDetails
          ? { stockLotDetails: { create: draftProduct.stockLotDetails } }
          : {}),
        ...(draftProduct?.singleStyleDetails
          ? { singleStyleDetails: { create: draftProduct.singleStyleDetails } }
          : {}),
      },
    })
    return translation
  })
}

export async function unpublishProductLocale(
  productId: string,
  localeValue: unknown,
  actorId: string,
) {
  productId = validateEntityId(productId)
  const locale = validateLocale(localeValue)
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })
    if (!product) {
      throw new AdminServiceError("PRODUCT_NOT_FOUND")
    }
    if (locale === "en") {
      await tx.productTranslation.updateMany({
        where: { productId },
        data: { publishedAt: null },
      })
      await tx.product.update({
        where: { id: productId },
        data: { publishedAt: null, updatedById: actorId },
      })
      return
    }
    await tx.productTranslation.updateMany({
      where: { productId, locale },
      data: { publishedAt: null },
    })
    await tx.product.update({
      where: { id: productId },
      data: { updatedById: actorId },
    })
  })
}

export async function markProductSoldOut(productId: string, actorId: string) {
  productId = validateEntityId(productId)
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, archivedAt: true, publishedAt: true },
    })
    if (!product) {
      throw new AdminServiceError("PRODUCT_NOT_FOUND")
    }
    if (product.archivedAt) {
      throw new AdminServiceError("PRODUCT_ARCHIVED")
    }
    return tx.product.update({
      where: { id: productId },
      data: {
        status: "SOLD_OUT",
        availableQuantity: 0,
        draftData: Prisma.DbNull,
        updatedById: actorId,
      },
    })
  })
}

export async function duplicateProduct(
  productId: string,
  codeValue: unknown,
  actorId: string,
) {
  productId = validateEntityId(productId)
  const code = validateProductCode(codeValue)
  try {
    return await prisma.$transaction(async (tx) => {
      const source = await tx.product.findUnique({
        where: { id: productId },
        include: {
          translations: true,
          stockLotDetails: true,
          singleStyleDetails: true,
          variants: true,
        },
      })
      if (!source) {
        throw new AdminServiceError("PRODUCT_NOT_FOUND")
      }
      const sourceDraft = productDraft(source.draftData)
      return tx.product.create({
        data: {
          code,
          ...(sourceDraft ? productFields(sourceDraft) : {
            type: source.type,
            category: source.category,
            genderAge: source.genderAge,
            season: source.season,
            tags: source.tags,
            sourceType: source.sourceType,
            sourceLocation: source.sourceLocation,
            qualityGrade: source.qualityGrade,
            clearanceReason: source.clearanceReason,
            defectNotes: source.defectNotes,
            inspectionAvailable: source.inspectionAvailable,
            purchaseUnit: source.purchaseUnit,
            minimumOrderQuantity: source.minimumOrderQuantity,
            tradeTerms: source.tradeTerms,
            currency: source.currency,
            referencePriceMin: source.referencePriceMin,
            referencePriceMax: source.referencePriceMax,
            priceBasis: source.priceBasis,
            availableQuantity: source.availableQuantity,
          }),
          status: "DRAFT",
          lastVerifiedAt: source.lastVerifiedAt,
          createdById: actorId,
          updatedById: actorId,
          translations: {
            create: source.translations.map((translation) => {
              const draft = translationDraft(translation.draftData)
              return {
                locale: translation.locale,
                title: draft?.title ?? translation.title,
                summary: draft?.summary ?? translation.summary,
                description: draft?.description ?? translation.description,
                seoTitle: draft ? draft.seoTitle : translation.seoTitle,
                seoDescription: draft ? draft.seoDescription : translation.seoDescription,
                shareImageAlt: draft ? draft.shareImageAlt : translation.shareImageAlt,
              }
            }),
          },
          stockLotDetails: sourceDraft?.stockLotDetails
            ? { create: sourceDraft.stockLotDetails }
            : !sourceDraft && source.stockLotDetails
              ? {
                  create: {
                    totalPieces: source.stockLotDetails.totalPieces,
                    totalPackages: source.stockLotDetails.totalPackages,
                    totalWeightKg: source.stockLotDetails.totalWeightKg,
                    totalVolumeCbm: source.stockLotDetails.totalVolumeCbm,
                    categoryComposition: inputJson(source.stockLotDetails.categoryComposition),
                    sizeRange: source.stockLotDetails.sizeRange,
                    piecesPerPackage: source.stockLotDetails.piecesPerPackage,
                    containerLoadEstimate: inputJson(source.stockLotDetails.containerLoadEstimate),
                  },
                }
              : undefined,
          singleStyleDetails: sourceDraft?.singleStyleDetails
            ? { create: sourceDraft.singleStyleDetails }
            : !sourceDraft && source.singleStyleDetails
              ? {
                  create: {
                    styleNumber: source.singleStyleDetails.styleNumber,
                    fabric: source.singleStyleDetails.fabric,
                    styleNotes: source.singleStyleDetails.styleNotes,
                    piecesPerCarton: source.singleStyleDetails.piecesPerCarton,
                    factoryLeadTimeDays: source.singleStyleDetails.factoryLeadTimeDays,
                  },
                }
              : undefined,
          variants: {
            create: source.variants.map((variant) => ({
              sku: variant.sku,
              color: variant.color,
              size: variant.size,
              availableQuantity: variant.availableQuantity,
            })),
          },
        },
      })
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AdminServiceError("PRODUCT_CODE_EXISTS")
    }
    throw error
  }
}

export async function archiveProduct(productId: string, actorId: string) {
  productId = validateEntityId(productId)
  const now = new Date()
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })
    if (!product) {
      throw new AdminServiceError("PRODUCT_NOT_FOUND")
    }
    await tx.productTranslation.updateMany({
      where: { productId },
      data: { publishedAt: null, draftData: Prisma.DbNull },
    })
    return tx.product.update({
      where: { id: productId },
      data: {
        status: "ARCHIVED",
        archivedAt: now,
        publishedAt: null,
        draftData: Prisma.DbNull,
        updatedById: actorId,
      },
    })
  })
}

export async function restoreProduct(productId: string, actorId: string) {
  productId = validateEntityId(productId)
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, archivedAt: true },
    })
    if (!product) {
      throw new AdminServiceError("PRODUCT_NOT_FOUND")
    }
    if (!product.archivedAt && product.status !== "ARCHIVED") {
      throw new AdminServiceError("PRODUCT_NOT_ARCHIVED")
    }
    await tx.productTranslation.updateMany({
      where: { productId },
      data: { publishedAt: null, draftData: Prisma.DbNull },
    })
    return tx.product.update({
      where: { id: productId },
      data: {
        status: "DRAFT",
        archivedAt: null,
        publishedAt: null,
        draftData: Prisma.DbNull,
        updatedById: actorId,
      },
    })
  })
}
