import { describe, expect, it } from "vitest"
import { MAX_CATALOG_PAGE, parseCatalogFilters } from "@/modules/catalog/filters"

describe("catalog filters", () => {
  it("parses supported enum values and applies defaults", () => {
    expect(
      parseCatalogFilters({
        type: "STOCK_LOT",
        status: "READY_STOCK",
        sort: "PRICE_ASC",
        page: "2",
      }),
    ).toEqual({
      type: "STOCK_LOT",
      status: "READY_STOCK",
      sort: "PRICE_ASC",
      page: 2,
    })

    expect(parseCatalogFilters({})).toEqual({ sort: "LATEST", page: 1 })
  })

  it("ignores unsupported enum and sort values", () => {
    expect(
      parseCatalogFilters({
        type: "BUNDLE",
        status: "DRAFT",
        sort: "createdAt desc",
      }),
    ).toEqual({ sort: "LATEST", page: 1 })
  })

  it("ignores array values rather than choosing an arbitrary entry", () => {
    expect(
      parseCatalogFilters({
        search: ["shirt", "hoodie"],
        type: ["STOCK_LOT"],
        minPrice: ["1"],
        page: ["2"],
      }),
    ).toEqual({ sort: "LATEST", page: 1 })
  })

  it("normalizes and caps search and text filters", () => {
    const longCategory = `  ${"category ".repeat(20)}  `
    const filters = parseCatalogFilters({
      search: "  cotton\n  crew-neck   shirt  ",
      category: longCategory,
      genderAge: "  Adults   and children ",
      season: "  All   season  ",
      purchaseUnit: "  piece  ",
    })

    expect(filters.search).toBe("cotton crew-neck shirt")
    expect(filters.category).toHaveLength(80)
    expect(filters.category).not.toMatch(/^\s|\s$/)
    expect(filters.genderAge).toBe("Adults and children")
    expect(filters.season).toBe("All season")
    expect(filters.purchaseUnit).toBe("piece")
  })

  it("uses q as a search alias without overriding a valid search value", () => {
    expect(parseCatalogFilters({ q: "  hoodie lot " }).search).toBe("hoodie lot")
    expect(parseCatalogFilters({ search: "shirt", q: "hoodie" }).search).toBe("shirt")
  })

  it("accepts only finite nonnegative numeric bounds", () => {
    expect(
      parseCatalogFilters({
        minMoq: "0",
        maxMoq: "5000",
        minPrice: "1.25",
        maxPrice: "3",
      }),
    ).toMatchObject({ minMoq: 0, maxMoq: 5000, minPrice: 1.25, maxPrice: 3 })

    expect(
      parseCatalogFilters({
        minMoq: "-1",
        maxMoq: "NaN",
        minPrice: "Infinity",
        maxPrice: "",
      }),
    ).toEqual({ sort: "LATEST", page: 1 })
  })

  it("requires an integer page and clamps it to a safe upper bound", () => {
    expect(parseCatalogFilters({ page: "0" }).page).toBe(1)
    expect(parseCatalogFilters({ page: "2.5" }).page).toBe(1)
    expect(parseCatalogFilters({ page: "not-a-page" }).page).toBe(1)
    expect(parseCatalogFilters({ page: String(MAX_CATALOG_PAGE + 100) }).page).toBe(MAX_CATALOG_PAGE)
  })
})
