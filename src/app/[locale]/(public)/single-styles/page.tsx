import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CatalogPage } from "@/components/catalog/catalog-page"
import type { CatalogSearchParams } from "@/modules/catalog/filters"
import { createCatalogMetadata } from "@/modules/catalog/metadata"
import { isSupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

export const dynamic = "force-dynamic"

type SingleStylesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<CatalogSearchParams>
}

export async function generateMetadata({ params, searchParams }: SingleStylesPageProps): Promise<Metadata> {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isSupportedLocale(locale)) {
    return {}
  }
  const dictionary = getDictionary(locale)
  return createCatalogMetadata({
    locale,
    route: "single-styles",
    title: dictionary.catalog.singleStylesTitle,
    description: dictionary.catalog.singleStylesDescription,
    searchParams: query,
  })
}

export default async function SingleStylesPage({ params, searchParams }: SingleStylesPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isSupportedLocale(locale)) {
    notFound()
  }
  const dictionary = getDictionary(locale)
  return (
    <CatalogPage
      locale={locale}
      dictionary={dictionary}
      action={`/${locale}/single-styles`}
      title={dictionary.catalog.singleStylesTitle}
      description={dictionary.catalog.singleStylesDescription}
      searchParams={query}
      fixedType="SINGLE_STYLE"
    />
  )
}
