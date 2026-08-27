import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { MarketPageView } from "@/components/content/market-page"
import { isMarketSlug } from "@/modules/content/config"
import { createContentMetadata } from "@/modules/content/metadata"
import { getMarketPage } from "@/modules/content/queries"
import { isSupportedLocale } from "@/modules/localization/config"

export const dynamic = "force-dynamic"

type MarketRouteProps = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: MarketRouteProps): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isSupportedLocale(locale) || !isMarketSlug(slug)) {
    return {}
  }
  const page = await getMarketPage(slug, locale)
  return page ? createContentMetadata(page, locale, `markets/${slug}`) : {}
}

export default async function MarketPage({ params }: MarketRouteProps) {
  const { locale, slug } = await params
  if (!isSupportedLocale(locale) || !isMarketSlug(slug)) {
    notFound()
  }
  const page = await getMarketPage(slug, locale)
  if (!page) {
    notFound()
  }
  return <MarketPageView page={page} locale={locale} />
}
