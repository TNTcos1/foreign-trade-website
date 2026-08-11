"use client"

import Link from "next/link"

import { useInquiryList } from "@/components/inquiries/inquiry-list-provider"
import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

type InquiryListLinkProps = {
  locale: SupportedLocale
}

export function InquiryListLink({ locale }: InquiryListLinkProps) {
  const { count } = useInquiryList()
  const dictionary = getDictionary(locale)

  return (
    <Link
      className="inquiry-list-link"
      href={`/${locale}/inquiry`}
      aria-label={dictionary.inquiry.itemCount(count)}
    >
      <span>{dictionary.inquiry.list}</span>
      <span className="inquiry-list-count" aria-hidden="true">
        {count}
      </span>
    </Link>
  )
}
