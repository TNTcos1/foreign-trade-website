"use client"

import Link from "next/link"
import { useState } from "react"

import { InquiryListLink } from "@/components/public/inquiry-list-link"
import { LocaleSwitcher } from "@/components/public/locale-switcher"
import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

type SiteHeaderProps = {
  locale: SupportedLocale
}

export function SiteHeader({ locale }: SiteHeaderProps) {
  const dictionary = getDictionary(locale)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigation = [
    [dictionary.navigation.catalog, `/${locale}/catalog`],
    [dictionary.navigation.stockLots, `/${locale}/stock-lots`],
    [dictionary.navigation.singleStyles, `/${locale}/single-styles`],
    [dictionary.navigation.trustCenter, `/${locale}/trust`],
    [dictionary.navigation.howToBuy, `/${locale}/how-to-buy`],
    [dictionary.navigation.contact, `/${locale}/contact`],
  ] as const

  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        {dictionary.accessibility.skipToContent}
      </a>
      <div className="site-header__bar page-shell">
        <Link className="brand" href={`/${locale}`}>
          <span className="brand-mark" aria-hidden="true">
            HS
          </span>
          <span className="brand-copy">
            <strong>{dictionary.brand.name}</strong>
            <small>{dictionary.brand.descriptor}</small>
          </span>
        </Link>

        <nav
          className="site-navigation"
          id="site-navigation"
          aria-label={dictionary.accessibility.mainNavigation}
          data-open={menuOpen}
        >
          {navigation.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          <InquiryListLink locale={locale} />
          <LocaleSwitcher locale={locale} />
        </div>

        <button
          className="menu-button"
          type="button"
          aria-controls="site-navigation"
          aria-expanded={menuOpen}
          aria-label={
            menuOpen
              ? dictionary.accessibility.closeMenu
              : dictionary.accessibility.openMenu
          }
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
