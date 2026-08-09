import type { Metadata } from "next"

import { getAbsoluteSiteUrl } from "@/lib/site-url"
import type { CatalogSearchParams } from "@/modules/catalog/filters"
import type { SupportedLocale } from "@/modules/localization/config"

export function hasCatalogFacets(searchParams: CatalogSearchParams): boolean {
  return Object.values(searchParams).some((value) =>
    typeof value === "string" ? value.length > 0 : Boolean(value?.length),
  )
}

type CatalogMetadataInput = {
  locale: SupportedLocale
  route: string
  title: string
  description: string
  searchParams: CatalogSearchParams
}

export function createCatalogMetadata({
  locale,
  route,
  title,
  description,
  searchParams,
}: CatalogMetadataInput): Metadata {
  const localizedPath = `/${locale}/${route}`
  const canonical = getAbsoluteSiteUrl(localizedPath)

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: getAbsoluteSiteUrl(`/en/${route}`),
        ar: getAbsoluteSiteUrl(`/ar/${route}`),
      },
    },
    robots: hasCatalogFacets(searchParams)
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_AR" : "en_US",
      alternateLocale: locale === "ar" ? ["en_US"] : ["ar_AR"],
      url: canonical,
      title,
      description,
      siteName: locale === "ar" ? "هاربور ستوك" : "Harbor Stock",
    },
  }
}
