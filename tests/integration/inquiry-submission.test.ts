// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prisma } from "@/lib/prisma"
import {
  InquiryProductsUnavailableError,
  hashInquiryDeduplicationKey,
  submitInquiry,
} from "@/modules/inquiries/service"
import type { NormalizedInquiryInput } from "@/modules/inquiries/validation"

const createdInquiryIds = new Set<string>()
let readyProductId = ""
let bookingProductId = ""
let soldOutProductId = ""

function createInput(overrides: Partial<NormalizedInquiryInput> = {}): NormalizedInquiryInput {
  return {
    locale: "en",
    customerName: "Integration Buyer",
    country: "YE",
    whatsapp: "+967700000000",
    company: "Test Trading",
    requirement: "Please quote FOB Xiamen terms.",
    items: [
      {
        productId: readyProductId,
        requestedQuantity: 5_000,
        note: "Need inspection video",
      },
    ],
    source: {
      sessionId: crypto.randomUUID(),
      channel: "expo",
      campaign: "integration-2026",
      source: "expo",
      medium: "qr",
      landingPage: "/en/markets/yemen",
      firstProductCode: "DEV-STOCK-READY-001",
      marketCode: "yemen",
      referrer: "https://google.com/search",
    },
    idempotencyKey: crypto.randomUUID(),
    antiBotToken: "already-verified-by-route",
    website: "",
    ...overrides,
  }
}

beforeAll(async () => {
  const products = await prisma.product.findMany({
    where: {
      code: {
        in: [
          "DEV-STOCK-READY-001",
          "DEV-STYLE-BOOKING-001",
          "DEV-STOCK-SOLD-001",
        ],
      },
    },
    select: { id: true, code: true },
  })
  readyProductId = products.find(({ code }) => code === "DEV-STOCK-READY-001")?.id ?? ""
  bookingProductId = products.find(({ code }) => code === "DEV-STYLE-BOOKING-001")?.id ?? ""
  soldOutProductId = products.find(({ code }) => code === "DEV-STOCK-SOLD-001")?.id ?? ""
  expect(readyProductId).not.toBe("")
  expect(bookingProductId).not.toBe("")
  expect(soldOutProductId).not.toBe("")
})

afterAll(async () => {
  const inquiryIds = [...createdInquiryIds]
  const visits = inquiryIds.length > 0
    ? await prisma.inquiry.findMany({
        where: { id: { in: inquiryIds } },
        select: { sourceVisitId: true },
      })
    : []
  await prisma.inquiry.deleteMany({ where: { id: { in: inquiryIds } } })
  await prisma.sourceVisit.deleteMany({
    where: {
      id: {
        in: visits.flatMap(({ sourceVisitId }) => sourceVisitId ? [sourceVisitId] : []),
      },
    },
  })
  await prisma.$disconnect()
})

describe("inquiry submission transaction", () => {
  it("creates a localized snapshot, source, assignment, event, and pending notification", async () => {
    const result = await submitInquiry(createInput({
      items: [
        { productId: readyProductId, requestedQuantity: 5_000, note: "Need inspection video" },
        { productId: bookingProductId, requestedQuantity: 3_000, note: null },
      ],
    }))
    createdInquiryIds.add(result.inquiryId)

    expect(result).toMatchObject({
      duplicate: false,
      itemCount: 2,
    })
    expect(result.inquiryNumber).toMatch(/^INQ-\d{8}-[A-F0-9]{8}$/)
    expect(result.assignedSalesUserId).not.toBeNull()

    const inquiry = await prisma.inquiry.findUniqueOrThrow({
      where: { id: result.inquiryId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        sourceVisit: true,
        assignments: true,
        events: true,
        notificationAttempts: true,
      },
    })

    expect(inquiry).toMatchObject({
      locale: "en",
      customerName: "Integration Buyer",
      country: "YE",
      whatsapp: "+967700000000",
      status: "NEW",
    })
    expect(inquiry.sourceVisit).toMatchObject({
      channel: "expo",
      landingPage: "/en/markets/yemen",
      firstProductId: readyProductId,
    })
    expect(inquiry.items[0].snapshot).toMatchObject({
      productId: readyProductId,
      productCode: "DEV-STOCK-READY-001",
      title: "Mixed Summer Clothing Ready Stock Lot",
      status: "READY_STOCK",
      requestedNote: "Need inspection video",
    })
    expect(inquiry.assignments).toHaveLength(1)
    expect(inquiry.events).toEqual([
      expect.objectContaining({
        eventType: "SUBMITTED",
        details: {
          itemCount: 2,
          hasRequirement: true,
          locale: "en",
          sourceChannel: "expo",
        },
      }),
    ])
    expect(inquiry.notificationAttempts).toEqual([
      expect.objectContaining({
        channel: "EMAIL",
        status: "PENDING",
        attemptNumber: 1,
      }),
    ])
    expect(JSON.stringify(inquiry.events)).not.toContain("967700000000")
    expect(JSON.stringify(inquiry.events)).not.toContain("Please quote")
  })

  it("accepts a requirement-only inquiry without item rows", async () => {
    const result = await submitInquiry(createInput({
      items: [],
      requirement: "I need one container of children's clothing.",
    }))
    createdInquiryIds.add(result.inquiryId)

    const inquiry = await prisma.inquiry.findUniqueOrThrow({
      where: { id: result.inquiryId },
      include: { items: true },
    })
    expect(inquiry.items).toEqual([])
    expect(inquiry.requirement).toBe("I need one container of children's clothing.")
  })

  it("rejects the whole inquiry when any product is no longer addable", async () => {
    const input = createInput({
      items: [
        { productId: readyProductId, requestedQuantity: 5_000, note: null },
        { productId: soldOutProductId, requestedQuantity: 4_000, note: null },
      ],
    })

    await expect(submitInquiry(input)).rejects.toEqual(
      new InquiryProductsUnavailableError([soldOutProductId]),
    )
    await expect(prisma.inquiry.findUnique({
      where: { deduplicationKey: hashInquiryDeduplicationKey(input.idempotencyKey) },
    })).resolves.toBeNull()
  })

  it("returns the original inquiry for the same idempotency key", async () => {
    const input = createInput()
    const first = await submitInquiry(input)
    createdInquiryIds.add(first.inquiryId)
    const second = await submitInquiry(input)

    expect(second).toEqual({ ...first, duplicate: true })
    await expect(prisma.inquiry.count({
      where: { deduplicationKey: hashInquiryDeduplicationKey(input.idempotencyKey) },
    })).resolves.toBe(1)
    await expect(prisma.inquiryItem.count({
      where: { inquiryId: first.inquiryId },
    })).resolves.toBe(1)
  })
})
