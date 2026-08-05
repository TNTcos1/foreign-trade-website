import Link from "next/link"

import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

type InquiryListLinkProps = {
  locale: SupportedLocale
  count?: number
}

export function InquiryListLink({
  locale,
  count = 0,
}: InquiryListLinkProps) {
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
