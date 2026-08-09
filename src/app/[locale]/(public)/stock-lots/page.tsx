import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CatalogPage } from "@/components/catalog/catalog-page"
import type { CatalogSearchParams } from "@/modules/catalog/filters"
import { createCatalogMetadata } from "@/modules/catalog/metadata"
import { isSupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

export const dynamic = "force-dynamic"

type StockLotsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<CatalogSearchParams>
}

export async function generateMetadata({ params, searchParams }: StockLotsPageProps): Promise<Metadata> {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isSupportedLocale(locale)) {
    return {}
  }
  const dictionary = getDictionary(locale)
  return createCatalogMetadata({
    locale,
    route: "stock-lots",
    title: dictionary.catalog.stockLotsTitle,
    description: dictionary.catalog.stockLotsDescription,
    searchParams: query,
  })
}

export default async function StockLotsPage({ params, searchParams }: StockLotsPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isSupportedLocale(locale)) {
    notFound()
  }
  const dictionary = getDictionary(locale)
  return (
    <CatalogPage
      locale={locale}
      dictionary={dictionary}
      action={`/${locale}/stock-lots`}
      title={dictionary.catalog.stockLotsTitle}
      description={dictionary.catalog.stockLotsDescription}
      searchParams={query}
      fixedType="STOCK_LOT"
    />
  )
}
