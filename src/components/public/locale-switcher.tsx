"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense } from "react"

import {
  localizePath,
  type SupportedLocale,
} from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

type LocaleSwitcherProps = {
  locale: SupportedLocale
}

function LocaleSwitcherLink({ locale }: LocaleSwitcherProps) {
  const dictionary = getDictionary(locale)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const nextLocale = locale === "en" ? "ar" : "en"
  const query = searchParams.toString()
  const currentAddress = `${pathname}${query ? `?${query}` : ""}`

  return (
    <Link
      className="locale-switcher"
      href={localizePath(nextLocale, currentAddress)}
      lang={nextLocale}
      aria-label={`${dictionary.accessibility.changeLanguage}: ${dictionary.locale.switchLabel}`}
    >
      <span aria-hidden="true">{locale === "en" ? "ع" : "EN"}</span>
      <span>{dictionary.locale.switchLabel}</span>
    </Link>
  )
}

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const dictionary = getDictionary(locale)
  const nextLocale = locale === "en" ? "ar" : "en"

  return (
    <Suspense
      fallback={
        <Link
          className="locale-switcher"
          href={`/${nextLocale}`}
          lang={nextLocale}
          aria-label={`${dictionary.accessibility.changeLanguage}: ${dictionary.locale.switchLabel}`}
        >
          <span aria-hidden="true">{locale === "en" ? "ع" : "EN"}</span>
          <span>{dictionary.locale.switchLabel}</span>
        </Link>
      }
    >
      <LocaleSwitcherLink locale={locale} />
    </Suspense>
  )
}
