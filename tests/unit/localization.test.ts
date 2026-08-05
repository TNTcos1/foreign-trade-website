import { describe, expect, it } from "vitest"

import {
  defaultLocale,
  isRtlLocale,
  localizePath,
  supportedLocales,
} from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"
import { formatProductField } from "@/modules/localization/format"

describe("localization", () => {
  it("defines the supported locales and writing directions", () => {
    expect(supportedLocales).toEqual(["en", "ar"])
    expect(defaultLocale).toBe("en")
    expect(isRtlLocale("ar")).toBe(true)
    expect(isRtlLocale("en")).toBe(false)
    expect(isRtlLocale("fr")).toBe(false)
  })

  it("preserves the page when switching locale", () => {
    expect(localizePath("ar", "/en/products/lot-1001")).toBe(
      "/ar/products/lot-1001",
    )
    expect(localizePath("en", "/ar/catalog?utm_source=expo#stock")).toBe(
      "/en/catalog?utm_source=expo#stock",
    )
    expect(localizePath("ar", "/catalog")).toBe("/ar/catalog")
  })

  it("provides complete English and Arabic public-interface dictionaries", () => {
    const english = getDictionary("en")
    const arabic = getDictionary("ar")

    expect(english.navigation.catalog).toBe("Catalog")
    expect(arabic.navigation.catalog).toBe("الكتالوج")
    expect(english.statuses.readyStock).toBeTruthy()
    expect(arabic.inquiry.list).toBeTruthy()
    expect(english.trade.exportRoute).toBeTruthy()
    expect(arabic.validation.required).toBeTruthy()
    expect(english.accessibility.openMenu).toBeTruthy()
  })

  it("reads product copy from the requested translation row", () => {
    const product = {
      translations: [
        {
          locale: "en",
          title: "Mixed denim stock lot",
          summary: "Warehouse-verified denim",
          description: "A mixed lot ready for inspection.",
        },
        {
          locale: "ar",
          title: "دفعة ملابس جينز متنوعة",
          summary: "جينز موثق في المستودع",
          description: "دفعة متنوعة جاهزة للمعاينة.",
        },
      ],
    }

    expect(formatProductField(product, "ar")).toEqual(product.translations[1])
    expect(formatProductField(product, "en")).toEqual(product.translations[0])
  })

  it("does not substitute another language for a missing translation", () => {
    const product = {
      translations: [
        {
          locale: "en",
          title: "Mixed denim stock lot",
          summary: "Warehouse-verified denim",
          description: "A mixed lot ready for inspection.",
        },
      ],
    }

    expect(formatProductField(product, "ar")).toBeNull()
  })
})
