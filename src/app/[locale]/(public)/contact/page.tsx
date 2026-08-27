import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ContentPageView } from "@/components/content/content-page"
import { createContentMetadata } from "@/modules/content/metadata"
import { getContentPage } from "@/modules/content/queries"
import { isSupportedLocale } from "@/modules/localization/config"

export const dynamic = "force-dynamic"

const slug = "contact"

type ContentRouteProps = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ContentRouteProps): Promise<Metadata> {
  const { locale } = await params
  if (!isSupportedLocale(locale)) {
    return {}
  }
  const page = await getContentPage(slug, locale)
  return page ? createContentMetadata(page, locale, slug) : {}
}

export default async function ContactPage({ params }: ContentRouteProps) {
  const { locale } = await params
  if (!isSupportedLocale(locale)) {
    notFound()
  }
  const page = await getContentPage(slug, locale)
  if (!page) {
    notFound()
  }
  return <ContentPageView page={page} locale={locale} />
}
