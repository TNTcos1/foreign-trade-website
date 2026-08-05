import type { Metadata } from "next"
import type { ReactNode } from "react"

import {
  isRtlLocale,
  isSupportedLocale,
  supportedLocales,
} from "@/modules/localization/config"

import "../globals.css"

type LocaleLayoutProps = Readonly<{
  children: ReactNode
  params: Promise<{ locale: string }>
}>

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params

  if (!isSupportedLocale(locale)) {
    return {}
  }

  return locale === "ar"
    ? {
        title: "هاربور ستوك | ملابس تصفية بالجملة",
        description: "مخزون ملابس تصفية موثّق للمشترين بالجملة.",
      }
    : {
        title: "Harbor Stock | Wholesale clothing clearance",
        description: "Verified clothing clearance stock for wholesale buyers.",
      }
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params

  const documentLocale = isSupportedLocale(locale) ? locale : "en"

  return (
    <html
      lang={documentLocale}
      dir={isRtlLocale(documentLocale) ? "rtl" : "ltr"}
    >
      <body>{children}</body>
    </html>
  )
}
