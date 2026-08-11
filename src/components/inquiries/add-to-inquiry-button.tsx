"use client"

import { useRef } from "react"

import { useInquiryList } from "@/components/inquiries/inquiry-list-provider"
import type { PublicAnalyticsEvent } from "@/modules/analytics/events"
import type { InquiryListItem } from "@/modules/inquiries/storage"
import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

type Placement = Extract<
  PublicAnalyticsEvent["placement"],
  "product_card" | "product_detail"
>

export function AddToInquiryButton({
  productId,
  code,
  locale,
  placement,
  className = "button button--primary",
}: {
  productId: string
  code: string
  locale: SupportedLocale
  placement: Placement
  className?: string
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { items, addItem } = useInquiryList()
  const dictionary = getDictionary(locale)
  const selected = items.some((item) => item.productId === productId)

  const item: InquiryListItem = { productId, code, locale }
  return (
    <button
      ref={buttonRef}
      className={className}
      type="button"
      aria-pressed={selected}
      onClick={() => addItem(item, placement, buttonRef.current)}
    >
      {selected ? dictionary.inquiry.selected : dictionary.inquiry.add}
    </button>
  )
}
