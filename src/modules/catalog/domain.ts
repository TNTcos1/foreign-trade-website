import type { Prisma, ProductStatus, ProductType } from "@prisma/client"

export { isEffectiveInquiry } from "@/modules/inquiries/domain"
export type { InquiryItemSnapshot, InquiryValidityInput } from "@/modules/inquiries/domain"

export type PriceVisibilityProduct = {
  type: ProductType
  currency: string
  referencePriceMin: Prisma.Decimal | number | string | null
  referencePriceMax: Prisma.Decimal | number | string | null
  priceBasis: string | null
}

export type PriceVisibility =
  | { kind: "CONTACT_FOR_QUOTE" }
  | {
      kind: "REFERENCE_PRICE"
      currency: string
      minimum: string
      maximum: string
      basis: string | null
    }

export function canDisplayPublicProduct(status: ProductStatus): boolean {
  return status === "READY_STOCK" || status === "FACTORY_BOOKING" || status === "SOLD_OUT"
}

export function canAddToInquiry(status: ProductStatus): boolean {
  return status === "READY_STOCK" || status === "FACTORY_BOOKING"
}

export function formatPriceVisibility(product: PriceVisibilityProduct): PriceVisibility {
  if (product.referencePriceMin === null) {
    return { kind: "CONTACT_FOR_QUOTE" }
  }

  const minimum = String(product.referencePriceMin)
  const maximum = String(product.referencePriceMax ?? product.referencePriceMin)

  return {
    kind: "REFERENCE_PRICE",
    currency: product.currency,
    minimum,
    maximum,
    basis: product.priceBasis,
  }
}
