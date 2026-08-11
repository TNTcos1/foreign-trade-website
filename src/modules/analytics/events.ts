import { isSupportedLocale, type SupportedLocale } from "@/modules/localization/config"

export const PUBLIC_ANALYTICS_EVENT = "harbor-stock:public-event"

const eventNames = [
  "product_view",
  "inquiry_item_added",
  "inquiry_opened",
  "inquiry_submitted",
  "whatsapp_click",
  "locale_changed",
  "market_page_view",
] as const

const placements = [
  "product_card",
  "product_detail",
  "inquiry_drawer",
  "inquiry_page",
  "inquiry_success",
  "market_page",
  "locale_switcher",
] as const

export type PublicAnalyticsEvent = {
  name: (typeof eventNames)[number]
  locale: SupportedLocale
  itemCount?: number
  placement?: (typeof placements)[number]
  productCode?: string
  marketCode?: string
  channel?: string
  campaign?: string
}

const eventNameSet = new Set<string>(eventNames)
const placementSet = new Set<string>(placements)
const safeValuePattern = /^[\p{L}\p{N}._:/-]+$/u

function safeValue(value: unknown, maximum: number): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const normalized = value.trim().slice(0, maximum)
  return normalized && safeValuePattern.test(normalized) ? normalized : undefined
}

function sanitizePublicEvent(value: unknown): PublicAnalyticsEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const event = value as Record<string, unknown>
  if (
    typeof event.name !== "string" ||
    !eventNameSet.has(event.name) ||
    typeof event.locale !== "string" ||
    !isSupportedLocale(event.locale)
  ) {
    return null
  }

  const result: PublicAnalyticsEvent = {
    name: event.name as PublicAnalyticsEvent["name"],
    locale: event.locale,
  }

  if (
    typeof event.itemCount === "number" &&
    Number.isSafeInteger(event.itemCount) &&
    event.itemCount >= 0 &&
    event.itemCount <= 20
  ) {
    result.itemCount = event.itemCount
  }
  if (typeof event.placement === "string" && placementSet.has(event.placement)) {
    result.placement = event.placement as PublicAnalyticsEvent["placement"]
  }

  const productCode = safeValue(event.productCode, 120)
  const marketCode = safeValue(event.marketCode, 120)
  const channel = safeValue(event.channel, 64)
  const campaign = safeValue(event.campaign, 120)
  if (productCode) result.productCode = productCode
  if (marketCode) result.marketCode = marketCode
  if (channel) result.channel = channel
  if (campaign) result.campaign = campaign

  return result
}

export function trackPublicEvent(event: PublicAnalyticsEvent): void {
  if (typeof window === "undefined") {
    return
  }
  const sanitized = sanitizePublicEvent(event)
  if (!sanitized) {
    return
  }
  window.dispatchEvent(new CustomEvent(PUBLIC_ANALYTICS_EVENT, { detail: sanitized }))
}
