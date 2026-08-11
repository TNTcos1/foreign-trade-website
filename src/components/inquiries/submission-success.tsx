"use client"

import Link from "next/link"

import { TrackedWhatsAppLink } from "@/components/inquiries/tracked-whatsapp-link"
import type { InquirySuccessSummary } from "@/modules/inquiries/service"
import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

export function SubmissionSuccess({
  locale,
  summary,
  whatsappUrl,
}: {
  locale: SupportedLocale
  summary: InquirySuccessSummary
  whatsappUrl: string | null
}) {
  const copy = getDictionary(locale).inquiry.success

  return (
    <main id="main-content" tabIndex={-1} className="inquiry-success">
      <div className="page-shell inquiry-success__grid">
        <section className="inquiry-success__receipt">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <div className="inquiry-success__number">
            <span>{copy.reference}</span>
            <strong>{summary.number}</strong>
          </div>
          <p>{summary.itemCount > 0 ? copy.summary(summary.itemCount) : copy.requirementOnly}</p>
          <p>{copy.response}</p>
          <div className="inquiry-success__actions">
            {whatsappUrl ? (
              <TrackedWhatsAppLink
                className="button button--primary"
                href={whatsappUrl}
                locale={locale}
                itemCount={summary.itemCount}
                placement="inquiry_success"
              >
                {copy.whatsapp}
              </TrackedWhatsAppLink>
            ) : (
              <p className="inquiry-success__whatsapp-unavailable">{copy.whatsappUnavailable}</p>
            )}
            <Link className="button button--secondary" href={`/${locale}/stock`}>
              {copy.browse}
            </Link>
          </div>
        </section>

        {summary.items.length > 0 ? (
          <ol className="inquiry-success__items">
            {summary.items.map((item, index) => (
              <li key={`${item.productCode}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.productCode}</small>
                </div>
                {item.requestedQuantity ? <b>{new Intl.NumberFormat(locale).format(item.requestedQuantity)}</b> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </main>
  )
}
