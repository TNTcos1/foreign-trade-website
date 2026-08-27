import { describe, expect, it } from "vitest"

import { publicationStateFromPublishedAt as productPublicationState } from "@/components/admin/product-editor"
import { publicationStateFromPublishedAt as contentPublicationState } from "@/components/admin/content-editor"

describe("admin editor publication state", () => {
  it.each([
    ["a persisted publication timestamp", "2026-08-24T12:00:00.000Z", "PUBLISHED"],
    ["a persisted draft", null, "DRAFT"],
  ])("ProductEditor derives %s from the returned translation", (_, publishedAt, expected) => {
    expect(productPublicationState(publishedAt)).toBe(expected)
  })

  it.each([
    ["a persisted publication timestamp", "2026-08-24T12:00:00.000Z", "PUBLISHED"],
    ["a persisted draft", null, "DRAFT"],
  ])("ContentEditor derives %s from the returned translation", (_, publishedAt, expected) => {
    expect(contentPublicationState(publishedAt)).toBe(expected)
  })
})
