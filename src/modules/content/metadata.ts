import type { Metadata } from "next"

import { getAbsoluteSiteUrl } from "@/lib/site-url"
import type { LocalizedContentPage } from "@/modules/content/queries"
import type { SupportedLocale } from "@/modules/localization/config"

export function createContentMetadata(
  page: LocalizedContentPage,
  locale: SupportedLocale,
  route: string,
): Metadata {
  const title = page.seo.title ?? page.title
  const description = page.seo.description ?? page.summary ?? page.title
  const canonical = getAbsoluteSiteUrl(`/${locale}/${route}`)

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: Object.fromEntries(
        page.availableLocales.map((availableLocale) => [
          availableLocale,
          getAbsoluteSiteUrl(`/${availableLocale}/${route}`),
        ]),
      ),
    },
    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_AR" : "en_US",
      alternateLocale: page.availableLocales
        .filter((availableLocale) => availableLocale !== locale)
        .map((availableLocale) => availableLocale === "ar" ? "ar_AR" : "en_US"),
      url: canonical,
      title,
      description,
      siteName: locale === "ar" ? "هاربور ستوك" : "Harbor Stock",
    },
  }
}
