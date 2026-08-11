import { createHash, randomBytes } from "node:crypto"
import { Prisma, type Locale } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { canAddToInquiry } from "@/modules/catalog/domain"
import type { InquiryItemSnapshot } from "@/modules/inquiries/domain"
import type { NormalizedInquiryInput } from "@/modules/inquiries/validation"

export type SubmitInquiryResult = {
  inquiryId: string
  inquiryNumber: string
  assignedSalesUserId: string | null
  itemCount: number
  duplicate: boolean
}

export type InquirySuccessSummary = {
  number: string
  itemCount: number
  items: Array<{
    productCode: string
    title: string
    requestedQuantity: number | null
  }>
}

export class InquiryProductsUnavailableError extends Error {
  constructor(public readonly productIds: string[]) {
    super("One or more inquiry products are unavailable")
    this.name = "InquiryProductsUnavailableError"
  }
}

export function hashInquiryDeduplicationKey(value: string): string {
  return createHash("sha256")
    .update(`public-inquiry:v1:${value}`)
    .digest("hex")
}

function createInquiryNumber(now = new Date()): string {
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("")
  return `INQ-${date}-${randomBytes(4).toString("hex").toUpperCase()}`
}

function isUniqueConstraintError(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false
  }
  const target = error.meta?.target
  return Array.isArray(target)
    ? target.some((value) => String(value).includes(field))
    : String(target ?? "").includes(field)
}

async function findExistingInquiry(deduplicationKey: string): Promise<SubmitInquiryResult | null> {
  const existing = await prisma.inquiry.findUnique({
    where: { deduplicationKey },
    select: {
      id: true,
      number: true,
      assignedToId: true,
      _count: { select: { items: true } },
    },
  })
  return existing
    ? {
        inquiryId: existing.id,
        inquiryNumber: existing.number,
        assignedSalesUserId: existing.assignedToId,
        itemCount: existing._count.items,
        duplicate: true,
      }
    : null
}

function productSnapshot(
  product: {
    id: string
    code: string
    type: InquiryItemSnapshot["productType"]
    status: InquiryItemSnapshot["status"]
    currency: string
    referencePriceMin: Prisma.Decimal | null
    referencePriceMax: Prisma.Decimal | null
    priceBasis: string | null
    availableQuantity: number | null
    lastVerifiedAt: Date | null
    translations: Array<{ title: string }>
  },
  requestedNote: string | null,
): InquiryItemSnapshot {
  const translation = product.translations[0]
  if (!translation) {
    throw new InquiryProductsUnavailableError([product.id])
  }

  return {
    productId: product.id,
    productCode: product.code,
    title: translation.title,
    productType: product.type,
    status: product.status,
    referencePrice: product.referencePriceMin === null
      ? null
      : {
          currency: product.currency,
          minimum: product.referencePriceMin.toString(),
          maximum: (product.referencePriceMax ?? product.referencePriceMin).toString(),
          basis: product.priceBasis,
        },
    availableQuantity: product.availableQuantity,
    lastVerifiedAt: product.lastVerifiedAt?.toISOString() ?? null,
    requestedNote,
  }
}

async function selectSalesUser(
  tx: Prisma.TransactionClient,
  locale: Locale,
  marketPageId: string | null,
): Promise<{ id: string; email: string } | null> {
  const users = await tx.adminUser.findMany({
    where: { role: "SALES", active: true },
    select: {
      id: true,
      email: true,
      assignmentsReceived: {
        where: {
          inquiry: {
            locale,
            ...(marketPageId
              ? { sourceVisit: { is: { marketPageId } } }
              : {}),
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  users.sort((left, right) => {
    const leftTime = left.assignmentsReceived[0]?.createdAt.getTime() ?? 0
    const rightTime = right.assignmentsReceived[0]?.createdAt.getTime() ?? 0
    return leftTime - rightTime || left.id.localeCompare(right.id)
  })
  const selected = users[0]
  return selected ? { id: selected.id, email: selected.email } : null
}

async function createInquiryTransaction(
  input: NormalizedInquiryInput,
  deduplicationKey: string,
): Promise<SubmitInquiryResult> {
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.inquiry.findUnique({
      where: { deduplicationKey },
      select: {
        id: true,
        number: true,
        assignedToId: true,
        _count: { select: { items: true } },
      },
    })
    if (duplicate) {
      return {
        inquiryId: duplicate.id,
        inquiryNumber: duplicate.number,
        assignedSalesUserId: duplicate.assignedToId,
        itemCount: duplicate._count.items,
        duplicate: true,
      }
    }

    const now = new Date()
    const productIds = input.items.map(({ productId }) => productId)
    const products = productIds.length > 0
      ? await tx.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            code: true,
            type: true,
            status: true,
            currency: true,
            referencePriceMin: true,
            referencePriceMax: true,
            priceBasis: true,
            availableQuantity: true,
            lastVerifiedAt: true,
            publishedAt: true,
            archivedAt: true,
            translations: {
              where: { locale: input.locale },
              select: { title: true },
              take: 1,
            },
          },
        })
      : []
    const productsById = new Map(products.map((product) => [product.id, product]))
    const unavailableProductIds = input.items
      .filter(({ productId }) => {
        const product = productsById.get(productId)
        return !product ||
          !canAddToInquiry(product.status) ||
          product.publishedAt === null ||
          product.publishedAt > now ||
          product.archivedAt !== null ||
          product.translations.length === 0
      })
      .map(({ productId }) => productId)
    if (unavailableProductIds.length > 0) {
      throw new InquiryProductsUnavailableError(unavailableProductIds)
    }

    const [firstProduct, marketPage] = await Promise.all([
      input.source.firstProductCode
        ? tx.product.findUnique({
            where: { code: input.source.firstProductCode },
            select: { id: true },
          })
        : null,
      input.source.marketCode
        ? tx.marketPage.findUnique({
            where: { marketCode: input.source.marketCode },
            select: { id: true },
          })
        : null,
    ])
    const assignee = await selectSalesUser(tx, input.locale, marketPage?.id ?? null)
    const sourceVisit = await tx.sourceVisit.create({
      data: {
        sessionId: input.source.sessionId,
        channel: input.source.channel,
        campaign: input.source.campaign,
        source: input.source.source,
        medium: input.source.medium,
        landingPage: input.source.landingPage,
        firstProductId: firstProduct?.id,
        marketPageId: marketPage?.id,
        referrer: input.source.referrer,
        metadata: { locale: input.locale },
      },
      select: { id: true },
    })

    const inquiry = await tx.inquiry.create({
      data: {
        number: createInquiryNumber(now),
        locale: input.locale,
        customerName: input.customerName,
        country: input.country,
        whatsapp: input.whatsapp,
        company: input.company,
        requirement: input.requirement,
        assignedToId: assignee?.id,
        sourceVisitId: sourceVisit.id,
        deduplicationKey,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            requestedQuantity: item.requestedQuantity,
            snapshot: productSnapshot(productsById.get(item.productId)!, item.note) as unknown as Prisma.InputJsonValue,
          })),
        },
        events: {
          create: {
            eventType: "SUBMITTED",
            details: {
              itemCount: input.items.length,
              hasRequirement: input.requirement !== null,
              locale: input.locale,
              sourceChannel: input.source.channel,
            },
          },
        },
        ...(assignee
          ? {
              assignments: {
                create: {
                  assignedToId: assignee.id,
                  reason: "Automatic public inquiry assignment",
                },
              },
              notificationAttempts: {
                create: {
                  channel: "EMAIL",
                  recipient: assignee.email,
                  status: "PENDING",
                  attemptNumber: 1,
                },
              },
            }
          : {}),
      },
      select: { id: true, number: true, assignedToId: true },
    })

    return {
      inquiryId: inquiry.id,
      inquiryNumber: inquiry.number,
      assignedSalesUserId: inquiry.assignedToId,
      itemCount: input.items.length,
      duplicate: false,
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function getInquirySuccessSummary(
  inquiryId: string,
  inquiryNumber: string,
): Promise<InquirySuccessSummary | null> {
  const inquiry = await prisma.inquiry.findFirst({
    where: { id: inquiryId, number: inquiryNumber },
    select: {
      number: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: { requestedQuantity: true, snapshot: true },
      },
    },
  })
  if (!inquiry) {
    return null
  }

  const items = inquiry.items.flatMap((item) => {
    if (!item.snapshot || typeof item.snapshot !== "object" || Array.isArray(item.snapshot)) {
      return []
    }
    const snapshot = item.snapshot as Record<string, unknown>
    if (typeof snapshot.productCode !== "string" || typeof snapshot.title !== "string") {
      return []
    }
    return [{
      productCode: snapshot.productCode,
      title: snapshot.title,
      requestedQuantity: item.requestedQuantity,
    }]
  })

  return {
    number: inquiry.number,
    itemCount: items.length,
    items,
  }
}

export async function submitInquiry(input: NormalizedInquiryInput): Promise<SubmitInquiryResult> {
  const deduplicationKey = hashInquiryDeduplicationKey(input.idempotencyKey)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createInquiryTransaction(input, deduplicationKey)
    } catch (error) {
      if (isUniqueConstraintError(error, "deduplicationKey")) {
        const duplicate = await findExistingInquiry(deduplicationKey)
        if (duplicate) {
          return duplicate
        }
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) {
        continue
      }
      if (isUniqueConstraintError(error, "number") && attempt < 2) {
        continue
      }
      throw error
    }
  }

  throw new Error("Unable to submit inquiry")
}
