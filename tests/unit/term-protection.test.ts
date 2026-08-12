// @vitest-environment node

import { describe, expect, it } from "vitest"

import {
  TranslationIntegrityError,
  protectTerms,
  restoreTerms,
} from "@/modules/translation/term-protection"

const commercialText = "DEV-STOCK-READY-001: MOQ 1,000 pcs at USD 0.90–1.30, size 60×40 cm, 30–45 days"

describe("translation term protection", () => {
  it("restores commercial values exactly after translation", () => {
    const protectedInput = protectTerms(commercialText, ["DEV-STOCK-READY-001"])
    const translated = `تفاصيل ${protectedInput.maskedText}`

    expect(restoreTerms(translated, protectedInput)).toBe(`تفاصيل ${commercialText}`)
    expect(protectedInput.tokens.map((token) => token.value)).toEqual(expect.arrayContaining([
      "DEV-STOCK-READY-001",
      "MOQ 1,000 pcs",
      "USD 0.90–1.30",
      "60×40 cm",
      "30–45 days",
    ]))
  })

  it.each(["missing", "duplicate", "unknown", "changed"])(
    "rejects %s placeholders",
    (failure) => {
      const protectedInput = protectTerms(commercialText, ["DEV-STOCK-READY-001"])
      const [first] = protectedInput.tokens
      expect(first).toBeDefined()
      let translated = protectedInput.maskedText

      if (failure === "missing") {
        translated = translated.replace(first.placeholder, "")
      } else if (failure === "duplicate") {
        translated = `${translated} ${first.placeholder}`
      } else if (failure === "unknown") {
        translated = `${translated} ${protectedInput.markerPrefix}999__`
      } else {
        translated = translated.replace(first.placeholder, first.placeholder.toLowerCase())
      }

      expect(() => restoreTerms(translated, protectedInput)).toThrow(TranslationIntegrityError)
    },
  )

  it("rejects ambiguous explicit terms instead of partially protecting them", () => {
    expect(() => protectTerms("Code DEV-001", ["MISSING-001"])).toThrow(TranslationIntegrityError)
  })
})
