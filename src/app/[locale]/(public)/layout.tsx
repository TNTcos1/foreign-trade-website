import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { AnalyticsProvider } from "@/components/analytics/analytics-provider"
import { InquiryListProvider } from "@/components/inquiries/inquiry-list-provider"
import { SiteFooter } from "@/components/public/site-footer"
import { SiteHeader } from "@/components/public/site-header"
import { createOrganizationJsonLd } from "@/modules/content/structured-data"
import { isSupportedLocale } from "@/modules/localization/config"

type PublicLayoutProps = Readonly<{
  children: ReactNode
  params: Promise<{ locale: string }>
}>

export default async function PublicLayout({
  children,
  params,
}: PublicLayoutProps) {
  const { locale } = await params

  if (!isSupportedLocale(locale)) {
    notFound()
  }

  const organizationJsonLd = JSON.stringify(createOrganizationJsonLd(locale))
    .replace(/</g, "\\u003c")

  return (
    <InquiryListProvider locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
      />
      <AnalyticsProvider locale={locale} />
      <div className="site-frame">
        <SiteHeader locale={locale} />
        {children}
        <SiteFooter locale={locale} />
      </div>
    </InquiryListProvider>
  )
}
