import { describe, expect, it, vi } from "vitest"

import { PUBLIC_ANALYTICS_EVENT, trackPublicEvent } from "@/modules/analytics/events"
import { parseSourceContext } from "@/modules/analytics/source"

describe("anonymous source tracking", () => {
  it("keeps first-touch campaign context without query-string customer data", () => {
    const result = parseSourceContext(
      "https://example.com/en/markets/yemen?utm_source=expo&utm_campaign=card-2026&utm_medium=qr&whatsapp=%2B967700000000",
      "https://google.com/search?q=private+buyer+query",
      "ee04e99f-613a-47dd-b7e4-1950e1423f82",
    )

    expect(result).toEqual({
      sessionId: "ee04e99f-613a-47dd-b7e4-1950e1423f82",
      channel: "expo",
      source: "expo",
      campaign: "card-2026",
      medium: "qr",
      landingPage: "/en/markets/yemen",
      firstProductCode: null,
      marketCode: "yemen",
      referrer: "https://google.com/search",
    })
    expect(JSON.stringify(result)).not.toContain("967700000000")
    expect(JSON.stringify(result)).not.toContain("private")
  })

  it("dispatches only a constructed anonymous event payload", () => {
    const listener = vi.fn()
    window.addEventListener(PUBLIC_ANALYTICS_EVENT, listener)

    trackPublicEvent({
      name: "whatsapp_click",
      locale: "ar",
      itemCount: 2,
      placement: "inquiry_success",
      channel: "expo",
    })

    expect(listener).toHaveBeenCalledOnce()
    const event = listener.mock.calls[0][0] as CustomEvent
    expect(event.detail).toEqual({
      name: "whatsapp_click",
      locale: "ar",
      itemCount: 2,
      placement: "inquiry_success",
      channel: "expo",
    })
    expect(event.detail).not.toHaveProperty("whatsapp")
    expect(event.detail).not.toHaveProperty("requirement")

    window.removeEventListener(PUBLIC_ANALYTICS_EVENT, listener)
  })
})
