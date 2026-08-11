"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { trackPublicEvent } from "@/modules/analytics/events"
import type { SupportedLocale } from "@/modules/localization/config"

type AnalyticsProviderProps = {
  locale: SupportedLocale
}

export function AnalyticsProvider({ locale }: AnalyticsProviderProps) {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    if (lastTrackedPath.current === pathname) {
      return
    }
    lastTrackedPath.current = pathname

    const productMatch = pathname.match(/^\/(?:en|ar)\/products\/([^/]+)\/?$/)
    if (productMatch?.[1]) {
      try {
        trackPublicEvent({
          name: "product_view",
          locale,
          placement: "product_detail",
          productCode: decodeURIComponent(productMatch[1]),
        })
      } catch {
        return
      }
      return
    }

    const marketMatch = pathname.match(/^\/(?:en|ar)\/markets\/([^/]+)\/?$/)
    if (marketMatch?.[1]) {
      trackPublicEvent({
        name: "market_page_view",
        locale,
        placement: "market_page",
        marketCode: marketMatch[1],
      })
    }
  }, [locale, pathname])

  return null
}
