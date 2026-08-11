import { describe, expect, it } from "vitest"

import { validateInquiryForm } from "@/modules/inquiries/validation"

const validProductId = "68f28959-5a8f-4563-afb4-baa8fd0174bc"

function validInput() {
  return {
    locale: "en",
    name: "  Ali Hassan  ",
    country: " ye ",
    whatsapp: "+967 700-000-000",
    company: "  Aden Trading  ",
    requirement: "",
    items: [{ productId: validProductId, quantity: 500, note: "  Blue if possible  " }],
    source: {
      sessionId: "ee04e99f-613a-47dd-b7e4-1950e1423f82",
      channel: "expo",
      landingPage: "/en/stock?utm_source=expo",
    },
    idempotencyKey: "d72be864-334c-4677-b8d0-4c71bb17a697",
    antiBotToken: "signed-token",
    website: "",
  }
}

describe("inquiry form validation", () => {
  it("normalizes a valid product inquiry", () => {
    const result = validateInquiryForm(validInput())

    expect(result).toEqual({
      success: true,
      data: {
        locale: "en",
        customerName: "Ali Hassan",
        country: "YE",
        whatsapp: "+967700000000",
        company: "Aden Trading",
        requirement: null,
        items: [{ productId: validProductId, requestedQuantity: 500, note: "Blue if possible" }],
        source: {
          sessionId: "ee04e99f-613a-47dd-b7e4-1950e1423f82",
          channel: "expo",
          landingPage: "/en/stock",
          campaign: null,
          source: null,
          medium: null,
          firstProductCode: null,
          marketCode: null,
          referrer: null,
        },
        idempotencyKey: "d72be864-334c-4677-b8d0-4c71bb17a697",
        antiBotToken: "signed-token",
        website: "",
      },
    })
  })

  it("requires name, country, WhatsApp, and an item or meaningful requirement", () => {
    const result = validateInquiryForm({
      ...validInput(),
      name: "",
      country: "",
      whatsapp: "",
      items: [],
      requirement: "...",
    })

    expect(result).toMatchObject({
      success: false,
      fieldErrors: {
        name: ["REQUIRED"],
        country: ["REQUIRED"],
        whatsapp: ["REQUIRED"],
        items: ["REQUIREMENT_OR_ITEM_REQUIRED"],
      },
    })
  })

  it("accepts a clear Arabic requirement without selected products", () => {
    const result = validateInquiryForm({
      ...validInput(),
      locale: "ar",
      items: [],
      requirement: "أحتاج إلى حاوية من ملابس الأطفال",
    })

    expect(result.success).toBe(true)
  })

  it("rejects invalid WhatsApp, duplicate IDs, quantities, and oversized notes", () => {
    const result = validateInquiryForm({
      ...validInput(),
      whatsapp: "123",
      items: [
        { productId: validProductId, quantity: 0, note: "x".repeat(501) },
        { productId: validProductId },
        { productId: "not-a-uuid" },
      ],
    })

    expect(result).toMatchObject({
      success: false,
      fieldErrors: { whatsapp: ["INVALID_WHATSAPP"] },
    })
    if (result.success) {
      throw new Error("Expected validation to fail")
    }
    expect(result.itemErrors).toEqual(expect.arrayContaining([
      { index: 0, productId: validProductId, code: "INVALID_QUANTITY" },
      { index: 0, productId: validProductId, code: "TOO_LONG" },
      { index: 1, productId: validProductId, code: "DUPLICATE_ITEM" },
      { index: 2, code: "INVALID_ID" },
    ]))
  })

  it("rejects unsupported locales, invalid countries, honeypots, and excessive lists", () => {
    const result = validateInquiryForm({
      ...validInput(),
      locale: "fr",
      country: "YEM",
      website: "spam.example",
      items: Array.from({ length: 21 }, (_, index) => ({
        productId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      })),
    })

    expect(result).toMatchObject({
      success: false,
      fieldErrors: {
        form: ["INVALID_LOCALE", "BOT_REJECTED"],
        country: ["INVALID_COUNTRY"],
        items: ["TOO_MANY_ITEMS"],
      },
    })
  })
})
