import type { ProductStatus, ProductType } from "@prisma/client"

export type InquiryValidityInput = {
  whatsapp: string
  itemCount: number
  requirement: string
}

export type InquiryItemSnapshot = {
  productId: string
  productCode: string
  title: string
  productType: ProductType
  status: ProductStatus
  referencePrice: {
    currency: string
    minimum: string | null
    maximum: string | null
    basis: string | null
  } | null
  availableQuantity: number | null
  lastVerifiedAt: string | null
}

export function isEffectiveInquiry(input: InquiryValidityInput): boolean {
  return input.whatsapp.trim().length > 0 && (input.itemCount > 0 || input.requirement.trim().length > 0)
}
