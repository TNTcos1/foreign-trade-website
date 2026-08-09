import type { ProductStatus, ProductType } from "@prisma/client"

export const CATALOG_PAGE_SIZE = 24
export const MAX_CATALOG_PAGE = 10_000

export const catalogSortValues = ["LATEST", "PRICE_ASC", "PRICE_DESC", "MOQ_ASC"] as const
export type CatalogSort = (typeof catalogSortValues)[number]

export type CatalogSearchParams = Record<string, string | string[] | undefined>

export type CatalogFilters = {
  search?: string
  type?: ProductType
  status?: Extract<ProductStatus, "READY_STOCK" | "FACTORY_BOOKING" | "SOLD_OUT">
  category?: string
  genderAge?: string
  season?: string
  purchaseUnit?: string
  minMoq?: number
  maxMoq?: number
  minPrice?: number
  maxPrice?: number
  sort: CatalogSort
  page: number
}

const productTypes = new Set<ProductType>(["STOCK_LOT", "SINGLE_STYLE"])
type PublicCatalogStatus = NonNullable<CatalogFilters["status"]>
const publicStatuses = new Set<PublicCatalogStatus>([
  "READY_STOCK",
  "FACTORY_BOOKING",
  "SOLD_OUT",
])
const catalogSorts = new Set<CatalogSort>(catalogSortValues)
const TEXT_FILTER_MAX_LENGTH = 80
const SEARCH_MAX_LENGTH = 160

function getScalar(input: CatalogSearchParams, key: string): string | undefined {
  const value = input[key]
  return typeof value === "string" ? value : undefined
}

function normalizeText(value: string | undefined, maximumLength: number): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const normalized = value.trim().replace(/\s+/g, " ").slice(0, maximumLength).trimEnd()
  return normalized.length > 0 ? normalized : undefined
}

function parseNonnegativeNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function parsePage(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    return 1
  }

  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return 1
  }

  return Math.min(parsed, MAX_CATALOG_PAGE)
}

function parseWhitelistedValue<T extends string>(value: string | undefined, allowed: ReadonlySet<T>): T | undefined {
  return value !== undefined && allowed.has(value as T) ? (value as T) : undefined
}

export function parseCatalogFilters(input: CatalogSearchParams): CatalogFilters {
  const search = normalizeText(getScalar(input, "search"), SEARCH_MAX_LENGTH)
    ?? normalizeText(getScalar(input, "q"), SEARCH_MAX_LENGTH)
  const type = parseWhitelistedValue(getScalar(input, "type"), productTypes)
  const status = parseWhitelistedValue(getScalar(input, "status"), publicStatuses)
  const category = normalizeText(getScalar(input, "category"), TEXT_FILTER_MAX_LENGTH)
  const genderAge = normalizeText(getScalar(input, "genderAge"), TEXT_FILTER_MAX_LENGTH)
  const season = normalizeText(getScalar(input, "season"), TEXT_FILTER_MAX_LENGTH)
  const purchaseUnit = normalizeText(getScalar(input, "purchaseUnit"), TEXT_FILTER_MAX_LENGTH)
  const minMoq = parseNonnegativeNumber(getScalar(input, "minMoq"))
  const maxMoq = parseNonnegativeNumber(getScalar(input, "maxMoq"))
  const minPrice = parseNonnegativeNumber(getScalar(input, "minPrice"))
  const maxPrice = parseNonnegativeNumber(getScalar(input, "maxPrice"))
  const sort = parseWhitelistedValue(getScalar(input, "sort"), catalogSorts) ?? "LATEST"
  const page = parsePage(getScalar(input, "page"))

  return {
    ...(search ? { search } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(genderAge ? { genderAge } : {}),
    ...(season ? { season } : {}),
    ...(purchaseUnit ? { purchaseUnit } : {}),
    ...(minMoq !== undefined ? { minMoq } : {}),
    ...(maxMoq !== undefined ? { maxMoq } : {}),
    ...(minPrice !== undefined ? { minPrice } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
    sort,
    page,
  }
}
