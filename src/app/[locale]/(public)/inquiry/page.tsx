import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { InquiryForm } from "@/components/inquiries/inquiry-form"
import { getPublicProductByCode } from "@/modules/catalog/queries"
import { createFormToken, getInquirySecret } from "@/modules/inquiries/security"
import type { InquiryListItem } from "@/modules/inquiries/storage"
import { isSupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

type InquiryPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ product?: string | string[] }>
}

export default async function InquiryPage({ params, searchParams }: InquiryPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isSupportedLocale(locale)) {
    notFound()
  }

  const productCode = typeof query.product === "string" ? query.product.slice(0, 120) : ""
  const product = productCode ? await getPublicProductByCode(productCode, locale) : null
  const initialItem: InquiryListItem | null = product?.canAddToInquiry
    ? { productId: product.id, code: product.code, locale }
    : null
  const dictionary = getDictionary(locale)
  const copy = dictionary.inquiry.form

  return (
    <main id="main-content" tabIndex={-1} className="inquiry-page">
      <header className="inquiry-page__hero">
        <div className="page-shell">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
      </header>
      <div className="page-shell inquiry-page__body">
        <InquiryForm
          locale={locale}
          antiBotToken={createFormToken({ secret: getInquirySecret() })}
          initialItem={initialItem}
        />
      </div>
    </main>
  )
}
