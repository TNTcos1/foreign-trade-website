import type { SupportedLocale } from "@/modules/localization/config"
import { isSupportedLocale } from "@/modules/localization/config"
import {
  MAX_INQUIRY_ITEM_NOTE_LENGTH,
  MAX_INQUIRY_ITEMS,
  MAX_INQUIRY_QUANTITY,
} from "@/modules/inquiries/storage"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const COUNTRY_PATTERN = /^[A-Za-z]{2}$/
const SAFE_SOURCE_PATTERN = /^[\p{L}\p{N}._:/-]+$/u

export type InquiryField =
  | "name"
  | "country"
  | "whatsapp"
  | "company"
  | "requirement"
  | "items"
  | "form"

export type InquiryValidationCode =
  | "REQUIRED"
  | "TOO_LONG"
  | "INVALID_COUNTRY"
  | "INVALID_WHATSAPP"
  | "INVALID_ID"
  | "INVALID_QUANTITY"
  | "TOO_MANY_ITEMS"
  | "DUPLICATE_ITEM"
  | "REQUIREMENT_OR_ITEM_REQUIRED"
  | "INVALID_LOCALE"
  | "BOT_REJECTED"

export type InquirySubmissionPayload = {
  locale: SupportedLocale
  name: string
  country: string
  whatsapp: string
  company?: string
  requirement?: string
  items: Array<{
    productId: string
    quantity?: number
    note?: string
  }>
  source: {
    sessionId: string
    channel: string
    campaign?: string
    source?: string
    medium?: string
    landingPage: string
    firstProductCode?: string
    marketCode?: string
    referrer?: string
  }
  idempotencyKey: string
  antiBotToken: string
  website?: string
}

export type NormalizedSourceContext = {
  sessionId: string
  channel: string
  campaign: string | null
  source: string | null
  medium: string | null
  landingPage: string
  firstProductCode: string | null
  marketCode: string | null
  referrer: string | null
}

export type NormalizedInquiryInput = {
  locale: SupportedLocale
  customerName: string
  country: string
  whatsapp: string
  company: string | null
  requirement: string | null
  items: Array<{
    productId: string
    requestedQuantity: number | null
    note: string | null
  }>
  source: NormalizedSourceContext
  idempotencyKey: string
  antiBotToken: string
  website: string
}

export type InquiryItemValidationError = {
  index: number
  productId?: string
  code: InquiryValidationCode
}

export type InquiryValidationResult =
  | { success: true; data: NormalizedInquiryInput }
  | {
      success: false
      fieldErrors: Partial<Record<InquiryField, InquiryValidationCode[]>>
      itemErrors: InquiryItemValidationError[]
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function cleanText(value: unknown, maximum: number): { value: string; tooLong: boolean } {
  if (typeof value !== "string") {
    return { value: "", tooLong: false }
  }
  const normalized = value.trim().replace(/\s+/gu, " ")
  return { value: normalized.slice(0, maximum), tooLong: normalized.length > maximum }
}

function optionalSourceValue(value: unknown, maximum: number): string | null {
  const cleaned = cleanText(value, maximum).value
  return cleaned && SAFE_SOURCE_PATTERN.test(cleaned) ? cleaned : null
}

function cleanPath(value: unknown): string {
  const candidate = cleanText(value, 500).value
  try {
    const url = new URL(candidate || "/", "https://local.invalid")
    return url.pathname.startsWith("/") ? url.pathname : "/"
  } catch {
    return "/"
  }
}

function cleanReferrer(value: unknown): string | null {
  const candidate = cleanText(value, 500).value
  if (!candidate) {
    return null
  }
  try {
    const url = new URL(candidate)
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null
    }
    return `${url.origin}${url.pathname}`.slice(0, 500)
  } catch {
    return null
  }
}

function normalizeWhatsapp(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed || !/^\+?[\d\s().-]+$/.test(trimmed)) {
    return null
  }
  const digits = trimmed.replace(/\D/g, "")
  if (digits.length < 7 || digits.length > 15) {
    return null
  }
  return `+${digits}`
}

function hasMeaningfulRequirement(value: string): boolean {
  const meaningfulCharacters = value.match(/[\p{L}\p{N}]/gu) ?? []
  return value.length >= 10 && meaningfulCharacters.length >= 6
}

export function validateInquiryForm(input: unknown): InquiryValidationResult {
  const candidate = isRecord(input) ? input : {}
  const fieldErrors: Partial<Record<InquiryField, InquiryValidationCode[]>> = {}
  const itemErrors: InquiryItemValidationError[] = []

  function addFieldError(field: InquiryField, code: InquiryValidationCode): void {
    fieldErrors[field] = [...(fieldErrors[field] ?? []), code]
  }

  const localeValue = typeof candidate.locale === "string" ? candidate.locale : ""
  const locale: SupportedLocale = isSupportedLocale(localeValue) ? localeValue : "en"
  if (!isSupportedLocale(localeValue)) {
    addFieldError("form", "INVALID_LOCALE")
  }

  const name = cleanText(candidate.name, 120)
  if (!name.value) {
    addFieldError("name", "REQUIRED")
  } else if (name.tooLong) {
    addFieldError("name", "TOO_LONG")
  }

  const countryValue = cleanText(candidate.country, 3).value
  if (!countryValue) {
    addFieldError("country", "REQUIRED")
  } else if (!COUNTRY_PATTERN.test(countryValue)) {
    addFieldError("country", "INVALID_COUNTRY")
  }

  const rawWhatsapp = typeof candidate.whatsapp === "string" ? candidate.whatsapp.trim() : ""
  const whatsapp = normalizeWhatsapp(candidate.whatsapp)
  if (!rawWhatsapp) {
    addFieldError("whatsapp", "REQUIRED")
  } else if (!whatsapp) {
    addFieldError("whatsapp", "INVALID_WHATSAPP")
  }

  const company = cleanText(candidate.company, 120)
  if (company.tooLong) {
    addFieldError("company", "TOO_LONG")
  }
  const requirement = cleanText(candidate.requirement, 2_000)
  if (requirement.tooLong) {
    addFieldError("requirement", "TOO_LONG")
  }

  const website = cleanText(candidate.website, 200).value
  if (website) {
    addFieldError("form", "BOT_REJECTED")
  }

  const rawItems = Array.isArray(candidate.items) ? candidate.items : []
  if (rawItems.length > MAX_INQUIRY_ITEMS) {
    addFieldError("items", "TOO_MANY_ITEMS")
  }

  const items: NormalizedInquiryInput["items"] = []
  const productIds = new Set<string>()
  for (const [index, rawItem] of rawItems.slice(0, MAX_INQUIRY_ITEMS).entries()) {
    if (!isRecord(rawItem)) {
      itemErrors.push({ index, code: "INVALID_ID" })
      continue
    }

    const productId = typeof rawItem.productId === "string"
      ? rawItem.productId.trim()
      : ""
    if (!UUID_PATTERN.test(productId)) {
      itemErrors.push({ index, code: "INVALID_ID" })
      continue
    }
    if (productIds.has(productId)) {
      itemErrors.push({ index, productId, code: "DUPLICATE_ITEM" })
      continue
    }
    productIds.add(productId)

    let requestedQuantity: number | null = null
    if (rawItem.quantity !== undefined && rawItem.quantity !== null && rawItem.quantity !== "") {
      if (
        typeof rawItem.quantity !== "number" ||
        !Number.isSafeInteger(rawItem.quantity) ||
        rawItem.quantity <= 0 ||
        rawItem.quantity > MAX_INQUIRY_QUANTITY
      ) {
        itemErrors.push({ index, productId, code: "INVALID_QUANTITY" })
      } else {
        requestedQuantity = rawItem.quantity
      }
    }

    const note = cleanText(rawItem.note, MAX_INQUIRY_ITEM_NOTE_LENGTH)
    if (note.tooLong) {
      itemErrors.push({ index, productId, code: "TOO_LONG" })
    }

    items.push({
      productId,
      requestedQuantity,
      note: note.value || null,
    })
  }

  if (items.length === 0 && !hasMeaningfulRequirement(requirement.value)) {
    addFieldError("items", "REQUIREMENT_OR_ITEM_REQUIRED")
  }

  const sourceCandidate = isRecord(candidate.source) ? candidate.source : {}
  const sessionId = typeof sourceCandidate.sessionId === "string"
    ? sourceCandidate.sessionId.trim()
    : ""
  const idempotencyKey = typeof candidate.idempotencyKey === "string"
    ? candidate.idempotencyKey.trim()
    : ""
  const antiBotToken = cleanText(candidate.antiBotToken, 1_000).value

  if (!UUID_PATTERN.test(sessionId) || !UUID_PATTERN.test(idempotencyKey) || !antiBotToken) {
    addFieldError("form", "INVALID_ID")
  }

  if (Object.keys(fieldErrors).length > 0 || itemErrors.length > 0) {
    return { success: false, fieldErrors, itemErrors }
  }

  return {
    success: true,
    data: {
      locale,
      customerName: name.value,
      country: countryValue.toUpperCase(),
      whatsapp: whatsapp!,
      company: company.value || null,
      requirement: requirement.value || null,
      items,
      source: {
        sessionId,
        channel: optionalSourceValue(sourceCandidate.channel, 64) ?? "direct",
        campaign: optionalSourceValue(sourceCandidate.campaign, 120),
        source: optionalSourceValue(sourceCandidate.source, 120),
        medium: optionalSourceValue(sourceCandidate.medium, 120),
        landingPage: cleanPath(sourceCandidate.landingPage),
        firstProductCode: optionalSourceValue(sourceCandidate.firstProductCode, 120),
        marketCode: optionalSourceValue(sourceCandidate.marketCode, 120),
        referrer: cleanReferrer(sourceCandidate.referrer),
      },
      idempotencyKey,
      antiBotToken,
      website,
    },
  }
}
