import Link from "next/link"

import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

type SiteFooterProps = {
  locale: SupportedLocale
}

export function SiteFooter({ locale }: SiteFooterProps) {
  const dictionary = getDictionary(locale)

  return (
    <footer className="site-footer">
      <div className="page-shell site-footer__grid">
        <section className="site-footer__intro" aria-labelledby="footer-brand">
          <p className="brand-line" id="footer-brand">
            {dictionary.brand.name}
          </p>
          <p>{dictionary.footer.summary}</p>
        </section>

        <section aria-labelledby="footer-trade-desk">
          <h2 id="footer-trade-desk">{dictionary.footer.tradeDesk}</h2>
          <p>{dictionary.trade.exportRoute}</p>
          <p>{dictionary.footer.note}</p>
        </section>

        <section aria-labelledby="footer-navigation">
          <h2 id="footer-navigation">{dictionary.footer.navigation}</h2>
          <Link href={`/${locale}/catalog`}>
            {dictionary.navigation.catalog}
          </Link>
          <Link href={`/${locale}/how-to-buy`}>
            {dictionary.navigation.howToBuy}
          </Link>
          <Link href={`/${locale}/contact`}>
            {dictionary.navigation.contact}
          </Link>
        </section>
      </div>
      <div className="page-shell site-footer__base">
        <span>© {new Date().getFullYear()} {dictionary.brand.name}</span>
        <span>{dictionary.footer.rights}</span>
      </div>
    </footer>
  )
}
