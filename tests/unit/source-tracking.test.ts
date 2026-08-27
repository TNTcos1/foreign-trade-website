import { describe, expect, it, vi } from "vitest"

import { PUBLIC_ANALYTICS_EVENT, trackPublicEvent } from "@/modules/analytics/events"
import { parseSourceContext } from "@/modules/analytics/source"

describe("anonymous source tracking", () => {
  it("keeps first-touch campaign context without query-string customer data", () => {
    const result = parseSourceContext(
      "https://example.com/ar/markets/yemen?utm_source=expo&utm_campaign=card-2026&utm_medium=qr&whatsapp=%2B967700000000",
      "https://google.com/search?q=private+buyer+query",
      "ee04e99f-613a-47dd-b7e4-1950e1423f82",
    )

    expect(result).toEqual({
      sessionId: "ee04e99f-613a-47dd-b7e4-1950e1423f82",
      locale: "ar",
      channel: "expo",
      source: "expo",
      campaign: "card-2026",
      medium: "qr",
      landingPage: "/ar/markets/yemen",
      firstProductCode: null,
      marketCode: "yemen",
      referrer: "https://google.com/search",
    })
    expect(JSON.stringify(result)).not.toContain("967700000000")
    expect(JSON.stringify(result)).not.toContain("private")
  })

  it("recognizes product landing paths and rejects unsafe source values", () => {
    const result = parseSourceContext(
      "https://example.com/en/products/LOT-2026-01?channel=bad%20value&utm_campaign=summer%2Fexpo",
      "javascript:alert(1)",
      "ee04e99f-613a-47dd-b7e4-1950e1423f82",
    )

    expect(result).toMatchObject({
      locale: "en",
      channel: "direct",
      campaign: "summer/expo",
      firstProductCode: "LOT-2026-01",
      marketCode: null,
      referrer: null,
    })
  })

  it.each([
    "product_view",
    "inquiry_item_added",
    "inquiry_opened",
    "inquiry_submitted",
    "whatsapp_click",
    "locale_changed",
    "market_page_view",
  ] as const)("dispatches the whitelisted %s event", (name) => {
    const listener = vi.fn()
    window.addEventListener(PUBLIC_ANALYTICS_EVENT, listener)

    trackPublicEvent({
      name,
      locale: "ar",
      itemCount: 2,
      placement: "inquiry_success",
      productCode: "DEV-STOCK-READY-001",
      marketCode: "yemen",
      channel: "expo",
      campaign: "card-2026",
    })

    expect(listener).toHaveBeenCalledOnce()
    const event = listener.mock.calls[0][0] as CustomEvent
    expect(event.detail).toEqual({
      name,
      locale: "ar",
      itemCount: 2,
      placement: "inquiry_success",
      productCode: "DEV-STOCK-READY-001",
      marketCode: "yemen",
      channel: "expo",
      campaign: "card-2026",
    })

    window.removeEventListener(PUBLIC_ANALYTICS_EVENT, listener)
  })

  it("drops unknown events, unknown fields, and invalid anonymous values at runtime", () => {
    const listener = vi.fn()
    window.addEventListener(PUBLIC_ANALYTICS_EVENT, listener)

    trackPublicEvent({
      name: "whatsapp_click",
      locale: "en",
      productCode: "DEV-STOCK-READY-001",
      channel: "expo",
      whatsapp: "+967700000000",
      requirement: "private requirement",
    } as never)
    trackPublicEvent({ name: "customer_identified", locale: "en" } as never)

    expect(listener).toHaveBeenCalledOnce()
    const event = listener.mock.calls[0][0] as CustomEvent
    expect(event.detail).toEqual({
      name: "whatsapp_click",
      locale: "en",
      productCode: "DEV-STOCK-READY-001",
      channel: "expo",
    })
    expect(JSON.stringify(event.detail)).not.toContain("967700000000")
    expect(JSON.stringify(event.detail)).not.toContain("private")

    window.removeEventListener(PUBLIC_ANALYTICS_EVENT, listener)
  })
})
