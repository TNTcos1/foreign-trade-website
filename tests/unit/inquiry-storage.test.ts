import { describe, expect, it } from "vitest"

import {
  INQUIRY_LIST_STORAGE_KEY,
  createInquiryListStorage,
  createInquirySourceStorage,
} from "@/modules/inquiries/storage"

describe("inquiry list storage", () => {
  it("adds, updates, removes, and clears items", () => {
    const values = new Map<string, string>()
    const storage = createInquiryListStorage({ storage: values })

    storage.addItem({ productId: "68f28959-5a8f-4563-afb4-baa8fd0174bc", code: "LOT-1001", locale: "en" })
    storage.updateItem("68f28959-5a8f-4563-afb4-baa8fd0174bc", {
      quantity: 500,
      note: "  Need video inspection  ",
    })

    expect(storage.getItems()).toEqual([
      {
        productId: "68f28959-5a8f-4563-afb4-baa8fd0174bc",
        code: "LOT-1001",
        locale: "en",
        quantity: 500,
        note: "Need video inspection",
      },
    ])

    storage.removeItem("68f28959-5a8f-4563-afb4-baa8fd0174bc")
    expect(storage.getItems()).toEqual([])

    storage.addItem({ productId: "68f28959-5a8f-4563-afb4-baa8fd0174bc", code: "LOT-1001", locale: "en" })
    storage.clear()
    expect(storage.getItems()).toEqual([])
  })

  it("uses one list across locales without duplicating a product", () => {
    const storage = createInquiryListStorage({ storage: new Map() })
    const productId = "68f28959-5a8f-4563-afb4-baa8fd0174bc"

    storage.addItem({ productId, code: "LOT-1001", locale: "en", quantity: 200 })
    storage.addItem({ productId, code: "LOT-1001-AR", locale: "ar" })

    expect(storage.getItems()).toEqual([
      {
        productId,
        code: "LOT-1001-AR",
        locale: "ar",
        quantity: 200,
      },
    ])
  })

  it("drops malformed entries and rejects unknown storage versions", () => {
    const values = new Map<string, string>()
    values.set(INQUIRY_LIST_STORAGE_KEY, JSON.stringify({
      version: 1,
      items: [
        { productId: "68f28959-5a8f-4563-afb4-baa8fd0174bc", code: "LOT-1001", locale: "en" },
        { productId: "bad", code: "BAD", locale: "en" },
      ],
    }))

    const storage = createInquiryListStorage({ storage: values })
    expect(storage.getItems()).toHaveLength(1)

    values.set(INQUIRY_LIST_STORAGE_KEY, JSON.stringify({ version: 2, items: [] }))
    expect(storage.getItems()).toEqual([])

    values.set(INQUIRY_LIST_STORAGE_KEY, "not-json")
    expect(storage.getItems()).toEqual([])
  })

  it("caps the list and sanitizes item bounds", () => {
    const storage = createInquiryListStorage({ storage: new Map(), maxItems: 2 })

    storage.addItem({ productId: "68f28959-5a8f-4563-afb4-baa8fd0174bc", code: " A ", locale: "en" })
    storage.addItem({ productId: "2235d689-4f67-446b-9fb6-9d043cf27541", code: "B", locale: "en" })
    storage.addItem({ productId: "e50ca3b2-8ff5-493d-95c2-f36d12ecb4a0", code: "C", locale: "en" })
    storage.updateItem("68f28959-5a8f-4563-afb4-baa8fd0174bc", {
      quantity: -1,
      note: "x".repeat(501),
    })

    expect(storage.getItems()).toEqual([
      { productId: "68f28959-5a8f-4563-afb4-baa8fd0174bc", code: "A", locale: "en" },
      { productId: "2235d689-4f67-446b-9fb6-9d043cf27541", code: "B", locale: "en" },
    ])
  })

  it("preserves first-touch source separately and records only the first product", () => {
    const values = new Map<string, string>()
    const sourceStorage = createInquirySourceStorage({ storage: values })
    const firstTouch = {
      sessionId: "ee04e99f-613a-47dd-b7e4-1950e1423f82",
      channel: "expo",
      campaign: "card-2026",
      source: "expo",
      medium: "qr",
      landingPage: "/en/markets/yemen",
      firstProductCode: null,
      marketCode: "yemen",
      referrer: "https://google.com/search",
    }

    expect(sourceStorage.saveFirstTouch(firstTouch)).toEqual(firstTouch)
    expect(sourceStorage.saveFirstTouch({ ...firstTouch, channel: "social" })).toEqual(firstTouch)
    expect(sourceStorage.setFirstProductCode(" DEV-STOCK-READY-001 ")).toMatchObject({
      firstProductCode: "DEV-STOCK-READY-001",
    })
    expect(sourceStorage.setFirstProductCode("SECOND")).toMatchObject({
      firstProductCode: "DEV-STOCK-READY-001",
    })
    expect(values.has(INQUIRY_LIST_STORAGE_KEY)).toBe(false)
  })

  it("continues in memory when browser storage throws", () => {
    const failingStorage = {
      getItem() {
        throw new Error("blocked")
      },
      setItem() {
        throw new Error("blocked")
      },
      removeItem() {
        throw new Error("blocked")
      },
    }
    const storage = createInquiryListStorage({ storage: failingStorage })

    storage.addItem({
      productId: "68f28959-5a8f-4563-afb4-baa8fd0174bc",
      code: "LOT-1001",
      locale: "en",
    })

    expect(storage.getItems()).toHaveLength(1)
  })
})
