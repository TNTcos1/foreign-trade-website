import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { InquiryListProvider } from "@/components/inquiries/inquiry-list-provider"
import { SiteFooter } from "@/components/public/site-footer"
import { SiteHeader } from "@/components/public/site-header"
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

  return (
    <InquiryListProvider locale={locale}>
      <div className="site-frame">
        <SiteHeader locale={locale} />
        {children}
        <SiteFooter locale={locale} />
      </div>
    </InquiryListProvider>
  )
}
