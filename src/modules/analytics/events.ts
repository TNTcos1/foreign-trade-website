import type { SupportedLocale } from "@/modules/localization/config"

export const PUBLIC_ANALYTICS_EVENT = "harbor-stock:public-event"

export type PublicAnalyticsEvent = {
  name:
    | "inquiry_item_added"
    | "inquiry_opened"
    | "inquiry_submitted"
    | "whatsapp_click"
  locale: SupportedLocale
  itemCount?: number
  placement?: "product_card" | "product_detail" | "inquiry_drawer" | "inquiry_page" | "inquiry_success"
  productCode?: string
  channel?: string
  campaign?: string
}

export function trackPublicEvent(event: PublicAnalyticsEvent): void {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new CustomEvent(PUBLIC_ANALYTICS_EVENT, { detail: { ...event } }))
}
