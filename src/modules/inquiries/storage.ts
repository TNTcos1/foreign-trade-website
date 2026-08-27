import type { SupportedLocale } from "@/modules/localization/config"
import { isSupportedLocale } from "@/modules/localization/config"

export const INQUIRY_LIST_STORAGE_KEY = "harbor-stock:inquiry-list:v1"
export const INQUIRY_SOURCE_STORAGE_KEY = "harbor-stock:inquiry-source:v1"
export const MAX_INQUIRY_ITEMS = 20
export const MAX_INQUIRY_QUANTITY = 100_000_000
export const MAX_INQUIRY_ITEM_NOTE_LENGTH = 500

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">
type MapStorage = Pick<Map<string, string>, "get" | "set" | "delete">

export type InquiryStorageBackend = BrowserStorage | MapStorage

export type InquiryListItem = {
  productId: string
  code: string
  locale: SupportedLocale
  quantity?: number
  note?: string
}

export type InquiryListItemPatch = {
  quantity?: number
  note?: string
}

export interface InquiryListStorage {
  getItems(): InquiryListItem[]
  addItem(item: InquiryListItem): InquiryListItem[]
  updateItem(productId: string, patch: InquiryListItemPatch): InquiryListItem[]
  removeItem(productId: string): InquiryListItem[]
  clear(): InquiryListItem[]
}

export type InquirySourceContext = {
  sessionId: string
  locale?: SupportedLocale | null
  channel: string
  campaign: string | null
  source: string | null
  medium: string | null
  landingPage: string
  firstProductCode: string | null
  marketCode: string | null
  referrer: string | null
}

export interface InquirySourceStorage {
  get(): InquirySourceContext | null
  saveFirstTouch(context: InquirySourceContext): InquirySourceContext
  setFirstProductCode(code: string): InquirySourceContext | null
}

type InquiryListEnvelope = {
  version: 1
  items: InquiryListItem[]
}

function readValue(storage: InquiryStorageBackend, key: string): string | null {
  if ("getItem" in storage) {
    return storage.getItem(key)
  }
  return storage.get(key) ?? null
}

function writeValue(storage: InquiryStorageBackend, key: string, value: string): void {
  if ("setItem" in storage) {
    storage.setItem(key, value)
    return
  }
  storage.set(key, value)
}

function removeValue(storage: InquiryStorageBackend, key: string): void {
  if ("removeItem" in storage) {
    storage.removeItem(key)
    return
  }
  storage.delete(key)
}

function sanitizeQuantity(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= MAX_INQUIRY_QUANTITY
    ? value
    : undefined
}

function sanitizeNote(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const note = value.trim()
  return note.length > 0 && note.length <= MAX_INQUIRY_ITEM_NOTE_LENGTH
    ? note
    : undefined
}

function sanitizeItem(value: unknown): InquiryListItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const productId = typeof candidate.productId === "string"
    ? candidate.productId.trim()
    : ""
  const code = typeof candidate.code === "string"
    ? candidate.code.trim().slice(0, 120)
    : ""
  const locale = typeof candidate.locale === "string" ? candidate.locale : ""

  if (!UUID_PATTERN.test(productId) || !code || !isSupportedLocale(locale)) {
    return null
  }

  const quantity = sanitizeQuantity(candidate.quantity)
  const note = sanitizeNote(candidate.note)

  return {
    productId,
    code,
    locale,
    ...(quantity === undefined ? {} : { quantity }),
    ...(note === undefined ? {} : { note }),
  }
}

function parseItems(value: string | null, maxItems: number): InquiryListItem[] {
  if (!value) {
    return []
  }

  try {
    const envelope = JSON.parse(value) as unknown
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
      return []
    }
    const candidate = envelope as Record<string, unknown>
    if (candidate.version !== 1 || !Array.isArray(candidate.items)) {
      return []
    }

    const items: InquiryListItem[] = []
    const productIds = new Set<string>()
    for (const valueItem of candidate.items) {
      const item = sanitizeItem(valueItem)
      if (!item || productIds.has(item.productId)) {
        continue
      }
      productIds.add(item.productId)
      items.push(item)
      if (items.length === maxItems) {
        break
      }
    }
    return items
  } catch {
    return []
  }
}

export function createInquiryListStorage({
  storage,
  maxItems = MAX_INQUIRY_ITEMS,
}: {
  storage: InquiryStorageBackend
  maxItems?: number
}): InquiryListStorage {
  const itemLimit = Math.max(1, Math.min(MAX_INQUIRY_ITEMS, Math.floor(maxItems)))
  let memoryItems: InquiryListItem[] = []
  try {
    memoryItems = parseItems(readValue(storage, INQUIRY_LIST_STORAGE_KEY), itemLimit)
  } catch {
    // Browser storage can be unavailable while the in-memory list remains usable.
  }

  function getItems(): InquiryListItem[] {
    try {
      memoryItems = parseItems(readValue(storage, INQUIRY_LIST_STORAGE_KEY), itemLimit)
    } catch {
      // Browser storage can be unavailable while the in-memory list remains usable.
    }
    return memoryItems.map((item) => ({ ...item }))
  }

  function persist(items: InquiryListItem[]): InquiryListItem[] {
    memoryItems = items.map((item) => ({ ...item }))
    const envelope: InquiryListEnvelope = { version: 1, items: memoryItems }
    try {
      writeValue(storage, INQUIRY_LIST_STORAGE_KEY, JSON.stringify(envelope))
    } catch {
      // Keep the current page functional when persistence is blocked or full.
    }
    return memoryItems.map((item) => ({ ...item }))
  }

  return {
    getItems,
    addItem(value) {
      const item = sanitizeItem(value)
      if (!item) {
        return memoryItems.map((entry) => ({ ...entry }))
      }

      const existingIndex = memoryItems.findIndex(({ productId }) => productId === item.productId)
      if (existingIndex >= 0) {
        const items = memoryItems.map((entry) => ({ ...entry }))
        const existing = items[existingIndex]
        items[existingIndex] = {
          ...existing,
          code: item.code,
          locale: item.locale,
          ...(item.quantity === undefined ? {} : { quantity: item.quantity }),
          ...(item.note === undefined ? {} : { note: item.note }),
        }
        return persist(items)
      }

      return memoryItems.length < itemLimit
        ? persist([...memoryItems, item])
        : memoryItems.map((entry) => ({ ...entry }))
    },
    updateItem(productId, patch) {
      const index = memoryItems.findIndex((item) => item.productId === productId)
      if (index < 0) {
        return memoryItems.map((item) => ({ ...item }))
      }

      const items = memoryItems.map((item) => ({ ...item }))
      const next = { ...items[index] }
      if (Object.prototype.hasOwnProperty.call(patch, "quantity")) {
        const quantity = sanitizeQuantity(patch.quantity)
        if (quantity === undefined) {
          delete next.quantity
        } else {
          next.quantity = quantity
        }
      }
      if (Object.prototype.hasOwnProperty.call(patch, "note")) {
        const note = sanitizeNote(patch.note)
        if (note === undefined) {
          delete next.note
        } else {
          next.note = note
        }
      }
      items[index] = next
      return persist(items)
    },
    removeItem(productId) {
      return persist(memoryItems.filter((item) => item.productId !== productId))
    },
    clear() {
      memoryItems = []
      try {
        removeValue(storage, INQUIRY_LIST_STORAGE_KEY)
      } catch {
        // The in-memory list is already clear.
      }
      return []
    },
  }
}

function sanitizeSourceContext(value: unknown): InquirySourceContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const candidate = value as Record<string, unknown>
  const sessionId = typeof candidate.sessionId === "string" ? candidate.sessionId.trim() : ""
  const channel = typeof candidate.channel === "string" ? candidate.channel.trim().slice(0, 64) : ""
  const landingPage = typeof candidate.landingPage === "string"
    ? candidate.landingPage.trim().slice(0, 500)
    : ""
  if (!UUID_PATTERN.test(sessionId) || !channel || !landingPage.startsWith("/")) {
    return null
  }

  function optional(value: unknown, maximum: number): string | null {
    if (typeof value !== "string") {
      return null
    }
    const normalized = value.trim().slice(0, maximum)
    return normalized || null
  }

  const locale = typeof candidate.locale === "string" && isSupportedLocale(candidate.locale)
    ? candidate.locale
    : null

  return {
    sessionId,
    ...(locale ? { locale } : {}),
    channel,
    campaign: optional(candidate.campaign, 120),
    source: optional(candidate.source, 120),
    medium: optional(candidate.medium, 120),
    landingPage: landingPage.split(/[?#]/, 1)[0] || "/",
    firstProductCode: optional(candidate.firstProductCode, 120),
    marketCode: optional(candidate.marketCode, 120),
    referrer: optional(candidate.referrer, 500),
  }
}

export function createInquirySourceStorage({
  storage,
}: {
  storage: InquiryStorageBackend
}): InquirySourceStorage {
  let memoryContext: InquirySourceContext | null = null

  function get(): InquirySourceContext | null {
    try {
      const raw = readValue(storage, INQUIRY_SOURCE_STORAGE_KEY)
      if (!raw) {
        return memoryContext ? { ...memoryContext } : null
      }
      const envelope = JSON.parse(raw) as unknown
      if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
        return null
      }
      const candidate = envelope as Record<string, unknown>
      if (candidate.version !== 1) {
        return null
      }
      memoryContext = sanitizeSourceContext(candidate.context)
    } catch {
      // Preserve the current page context when storage is unavailable.
    }
    return memoryContext ? { ...memoryContext } : null
  }

  function persist(context: InquirySourceContext): InquirySourceContext {
    memoryContext = { ...context }
    try {
      writeValue(storage, INQUIRY_SOURCE_STORAGE_KEY, JSON.stringify({
        version: 1,
        context: memoryContext,
      }))
    } catch {
      // Keep first-touch attribution available for this page.
    }
    return { ...memoryContext }
  }

  return {
    get,
    saveFirstTouch(value) {
      const existing = get()
      if (existing) {
        return existing
      }
      const context = sanitizeSourceContext(value)
      if (!context) {
        throw new Error("Invalid inquiry source context")
      }
      return persist(context)
    },
    setFirstProductCode(value) {
      const context = get()
      if (!context || context.firstProductCode) {
        return context
      }
      const code = value.trim().slice(0, 120)
      return code ? persist({ ...context, firstProductCode: code }) : context
    },
  }
}
