import type { Locale, ProductStatus, ProductType } from "@prisma/client"

export class AdminServiceError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = "AdminServiceError"
  }
}

export type ProductTranslationInput = {
  title: string
  summary: string
  description: string
  seoTitle: string | null
  seoDescription: string | null
  shareImageAlt: string | null
}

export type ContentTranslationInput = {
  title: string
  summary: string | null
  body: string
  seoTitle: string | null
  seoDescription: string | null
}

type StockLotDetailsInput = {
  totalPieces: number
  totalPackages: number | null
  totalWeightKg: string | null
  totalVolumeCbm: string | null
  sizeRange: string | null
  piecesPerPackage: number | null
}

type SingleStyleDetailsInput = {
  styleNumber: string
  fabric: string | null
  styleNotes: string | null
  piecesPerCarton: number | null
  factoryLeadTimeDays: number | null
}

export type ProductBusinessInput = {
  type: ProductType
  status: Extract<ProductStatus, "DRAFT" | "READY_STOCK" | "FACTORY_BOOKING">
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
  currency: string
  referencePriceMin: string | null
  referencePriceMax: string | null
  priceBasis: string | null
  availableQuantity: number | null
  stockLotDetails: StockLotDetailsInput | null
  singleStyleDetails: SingleStyleDetailsInput | null
}

export type ProductDraftInput = ProductBusinessInput & {
  code: string
  translation: ProductTranslationInput
}

function invalid(code: string): never {
  throw new AdminServiceError(code)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function requiredText(value: unknown, maximum: number, code: string): string {
  if (typeof value !== "string") {
    return invalid(code)
  }
  const normalized = value.trim()
  if (!normalized || normalized.length > maximum) {
    return invalid(code)
  }
  return normalized
}

function optionalText(value: unknown, maximum: number, code: string): string | null {
  if (value === undefined || value === null || value === "") {
    return null
  }
  return requiredText(value, maximum, code)
}

function integer(
  value: unknown,
  code: string,
  { minimum = 1, maximum = 1_000_000_000 }: { minimum?: number; maximum?: number } = {},
): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    return invalid(code)
  }
  return value as number
}

function optionalInteger(
  value: unknown,
  code: string,
  options?: { minimum?: number; maximum?: number },
): number | null {
  return value === undefined || value === null
    ? null
    : integer(value, code, options)
}

function decimal(
  value: unknown,
  code: string,
  scale: number,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null
  }
  const normalized = typeof value === "number" ? String(value) : value
  const pattern = new RegExp(`^\\d{1,12}(?:\\.\\d{1,${scale}})?$`)
  if (typeof normalized !== "string" || !pattern.test(normalized)) {
    return invalid(code)
  }
  return normalized
}

function parseTags(value: unknown): string[] {
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value) || value.length > 30) {
    return invalid("INVALID_PRODUCT_INPUT")
  }
  const tags = value.map((tag) => requiredText(tag, 60, "INVALID_PRODUCT_INPUT"))
  if (new Set(tags).size !== tags.length) {
    return invalid("INVALID_PRODUCT_INPUT")
  }
  return tags
}

export function validateLocale(value: unknown): Locale {
  if (value !== "en" && value !== "ar") {
    return invalid("INVALID_LOCALE")
  }
  return value
}

export function validateEntityId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    return invalid("INVALID_ENTITY_ID")
  }
  return value
}

export function validateContentSlug(value: unknown): string {
  const slug = requiredText(value, 160, "INVALID_CONTENT_SLUG")
  if (!/^[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*$/u.test(slug)) {
    return invalid("INVALID_CONTENT_SLUG")
  }
  return slug
}

export function validateProductCode(value: unknown): string {
  const code = requiredText(value, 120, "INVALID_PRODUCT_CODE")
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(code)) {
    return invalid("INVALID_PRODUCT_CODE")
  }
  return code
}

export function validateProductTranslation(value: unknown): ProductTranslationInput {
  if (!isRecord(value)) {
    return invalid("INVALID_PRODUCT_TRANSLATION")
  }
  return {
    title: requiredText(value.title, 240, "INVALID_PRODUCT_TRANSLATION"),
    summary: requiredText(value.summary, 1_000, "INVALID_PRODUCT_TRANSLATION"),
    description: requiredText(value.description, 20_000, "INVALID_PRODUCT_TRANSLATION"),
    seoTitle: optionalText(value.seoTitle, 240, "INVALID_PRODUCT_TRANSLATION"),
    seoDescription: optionalText(value.seoDescription, 500, "INVALID_PRODUCT_TRANSLATION"),
    shareImageAlt: optionalText(value.shareImageAlt, 500, "INVALID_PRODUCT_TRANSLATION"),
  }
}

export function validateContentTranslation(value: unknown): ContentTranslationInput {
  if (!isRecord(value)) {
    return invalid("INVALID_CONTENT_TRANSLATION")
  }
  return {
    title: requiredText(value.title, 240, "INVALID_CONTENT_TRANSLATION"),
    summary: optionalText(value.summary, 1_000, "INVALID_CONTENT_TRANSLATION"),
    body: requiredText(value.body, 50_000, "INVALID_CONTENT_TRANSLATION"),
    seoTitle: optionalText(value.seoTitle, 240, "INVALID_CONTENT_TRANSLATION"),
    seoDescription: optionalText(value.seoDescription, 500, "INVALID_CONTENT_TRANSLATION"),
  }
}

export function validateProductBusinessFields(value: unknown): ProductBusinessInput {
  if (!isRecord(value)) {
    return invalid("INVALID_PRODUCT_INPUT")
  }
  const type = value.type
  if (type !== "STOCK_LOT" && type !== "SINGLE_STYLE") {
    return invalid("INVALID_PRODUCT_INPUT")
  }
  const status = value.status
  if (status !== "DRAFT" && status !== "READY_STOCK" && status !== "FACTORY_BOOKING") {
    return invalid("INVALID_PRODUCT_INPUT")
  }
  const referencePriceMin = decimal(value.referencePriceMin, "INVALID_PRODUCT_INPUT", 2)
  const referencePriceMax = decimal(value.referencePriceMax, "INVALID_PRODUCT_INPUT", 2)
  if (referencePriceMax && (!referencePriceMin || Number(referencePriceMax) < Number(referencePriceMin))) {
    return invalid("INVALID_PRODUCT_INPUT")
  }

  let stockLotDetails: StockLotDetailsInput | null = null
  let singleStyleDetails: SingleStyleDetailsInput | null = null
  if (type === "STOCK_LOT") {
    if (!isRecord(value.stockLotDetails) || value.singleStyleDetails != null) {
      return invalid("INVALID_PRODUCT_INPUT")
    }
    stockLotDetails = {
      totalPieces: integer(value.stockLotDetails.totalPieces, "INVALID_PRODUCT_INPUT"),
      totalPackages: optionalInteger(value.stockLotDetails.totalPackages, "INVALID_PRODUCT_INPUT"),
      totalWeightKg: decimal(value.stockLotDetails.totalWeightKg, "INVALID_PRODUCT_INPUT", 2),
      totalVolumeCbm: decimal(value.stockLotDetails.totalVolumeCbm, "INVALID_PRODUCT_INPUT", 3),
      sizeRange: optionalText(value.stockLotDetails.sizeRange, 120, "INVALID_PRODUCT_INPUT"),
      piecesPerPackage: optionalInteger(value.stockLotDetails.piecesPerPackage, "INVALID_PRODUCT_INPUT"),
    }
  } else {
    if (!isRecord(value.singleStyleDetails) || value.stockLotDetails != null) {
      return invalid("INVALID_PRODUCT_INPUT")
    }
    singleStyleDetails = {
      styleNumber: requiredText(value.singleStyleDetails.styleNumber, 120, "INVALID_PRODUCT_INPUT"),
      fabric: optionalText(value.singleStyleDetails.fabric, 240, "INVALID_PRODUCT_INPUT"),
      styleNotes: optionalText(value.singleStyleDetails.styleNotes, 2_000, "INVALID_PRODUCT_INPUT"),
      piecesPerCarton: optionalInteger(value.singleStyleDetails.piecesPerCarton, "INVALID_PRODUCT_INPUT"),
      factoryLeadTimeDays: optionalInteger(value.singleStyleDetails.factoryLeadTimeDays, "INVALID_PRODUCT_INPUT", { maximum: 3_650 }),
    }
  }

  return {
    type,
    status,
    category: requiredText(value.category, 160, "INVALID_PRODUCT_INPUT"),
    genderAge: optionalText(value.genderAge, 120, "INVALID_PRODUCT_INPUT"),
    season: optionalText(value.season, 120, "INVALID_PRODUCT_INPUT"),
    tags: parseTags(value.tags),
    sourceType: optionalText(value.sourceType, 160, "INVALID_PRODUCT_INPUT"),
    sourceLocation: optionalText(value.sourceLocation, 240, "INVALID_PRODUCT_INPUT"),
    qualityGrade: optionalText(value.qualityGrade, 120, "INVALID_PRODUCT_INPUT"),
    clearanceReason: optionalText(value.clearanceReason, 500, "INVALID_PRODUCT_INPUT"),
    defectNotes: optionalText(value.defectNotes, 2_000, "INVALID_PRODUCT_INPUT"),
    inspectionAvailable: value.inspectionAvailable === true,
    purchaseUnit: requiredText(value.purchaseUnit, 80, "INVALID_PRODUCT_INPUT"),
    minimumOrderQuantity: optionalInteger(value.minimumOrderQuantity, "INVALID_PRODUCT_INPUT"),
    tradeTerms: optionalText(value.tradeTerms, 240, "INVALID_PRODUCT_INPUT"),
    currency: (() => {
      const currency = requiredText(value.currency ?? "USD", 3, "INVALID_PRODUCT_INPUT").toUpperCase()
      return /^[A-Z]{3}$/.test(currency) ? currency : invalid("INVALID_PRODUCT_INPUT")
    })(),
    referencePriceMin,
    referencePriceMax,
    priceBasis: optionalText(value.priceBasis, 120, "INVALID_PRODUCT_INPUT"),
    availableQuantity: optionalInteger(value.availableQuantity, "INVALID_PRODUCT_INPUT", { minimum: 0 }),
    stockLotDetails,
    singleStyleDetails,
  }
}

export function validateProductDraft(value: unknown): ProductDraftInput {
  if (!isRecord(value)) {
    return invalid("INVALID_PRODUCT_INPUT")
  }
  return {
    ...validateProductBusinessFields(value),
    code: validateProductCode(value.code),
    translation: validateProductTranslation(value.translation),
  }
}
