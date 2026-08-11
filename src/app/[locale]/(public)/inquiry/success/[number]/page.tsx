import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import { SubmissionSuccess } from "@/components/inquiries/submission-success"
import { createWhatsAppUrl } from "@/lib/whatsapp"
import {
  INQUIRY_RECEIPT_COOKIE,
  getInquirySecret,
  verifyInquiryReceipt,
} from "@/modules/inquiries/security"
import { getInquirySuccessSummary } from "@/modules/inquiries/service"
import { isSupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

type SuccessPageProps = {
  params: Promise<{ locale: string; number: string }>
}

export default async function InquirySuccessPage({ params }: SuccessPageProps) {
  const { locale, number } = await params
  if (!isSupportedLocale(locale)) {
    notFound()
  }

  const receiptToken = (await cookies()).get(INQUIRY_RECEIPT_COOKIE)?.value
  const receipt = receiptToken
    ? verifyInquiryReceipt(receiptToken, { secret: getInquirySecret() })
    : null
  if (!receipt || receipt.inquiryNumber !== number) {
    notFound()
  }

  const summary = await getInquirySuccessSummary(receipt.inquiryId, number)
  if (!summary) {
    notFound()
  }

  const dictionary = getDictionary(locale)
  const whatsappUrl = createWhatsAppUrl(
    dictionary.inquiry.success.whatsappMessage(summary.number, summary.itemCount),
  )

  return (
    <SubmissionSuccess
      locale={locale}
      summary={summary}
      whatsappUrl={whatsappUrl}
    />
  )
}
