import { describe, expect, it } from "vitest"
import {
  canAddToInquiry,
  canDisplayPublicProduct,
  formatPriceVisibility,
  isEffectiveInquiry,
} from "@/modules/catalog/domain"

describe("catalog rules", () => {
  it("allows ready and booking products in public inquiry", () => {
    expect(canDisplayPublicProduct("READY_STOCK")).toBe(true)
    expect(canDisplayPublicProduct("FACTORY_BOOKING")).toBe(true)
    expect(canAddToInquiry("SOLD_OUT")).toBe(false)
  })

  it("keeps sold-out products public but excludes non-public workflow states", () => {
    expect(canDisplayPublicProduct("SOLD_OUT")).toBe(true)
    expect(canDisplayPublicProduct("DRAFT")).toBe(false)
    expect(canDisplayPublicProduct("ARCHIVED")).toBe(false)
    expect(canAddToInquiry("READY_STOCK")).toBe(true)
    expect(canAddToInquiry("FACTORY_BOOKING")).toBe(true)
  })

  it("requires WhatsApp and a product or clear requirement", () => {
    expect(isEffectiveInquiry({ whatsapp: "+967700000000", itemCount: 1, requirement: "" })).toBe(true)
    expect(isEffectiveInquiry({ whatsapp: "+967700000000", itemCount: 0, requirement: "mixed summer clothing, 5000 pcs" })).toBe(true)
    expect(isEffectiveInquiry({ whatsapp: "", itemCount: 1, requirement: "" })).toBe(false)
    expect(isEffectiveInquiry({ whatsapp: "  ", itemCount: 0, requirement: "  " })).toBe(false)
  })

  it("shows a numeric reference range only when a minimum price exists", () => {
    expect(
      formatPriceVisibility({
        type: "STOCK_LOT",
        currency: "USD",
        referencePriceMin: "1.25",
        referencePriceMax: null,
        priceBasis: "per piece",
      }),
    ).toEqual({
      kind: "REFERENCE_PRICE",
      currency: "USD",
      minimum: "1.25",
      maximum: "1.25",
      basis: "per piece",
    })
    expect(
      formatPriceVisibility({
        type: "SINGLE_STYLE",
        currency: "USD",
        referencePriceMin: null,
        referencePriceMax: null,
        priceBasis: null,
      }),
    ).toEqual({ kind: "CONTACT_FOR_QUOTE" })
  })
})
