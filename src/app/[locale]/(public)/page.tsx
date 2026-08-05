import Link from "next/link"
import { notFound } from "next/navigation"

import { StatusBadge } from "@/components/ui/status-badge"
import { isSupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

type LocaleHomePageProps = {
  params: Promise<{ locale: string }>
}

export default async function LocaleHomePage({ params }: LocaleHomePageProps) {
  const { locale } = await params

  if (!isSupportedLocale(locale)) {
    notFound()
  }

  const dictionary = getDictionary(locale)

  return (
    <main id="main-content" tabIndex={-1}>
      <section className="trade-hero">
        <div className="page-shell trade-hero__grid">
          <div className="trade-hero__copy">
            <p className="eyebrow">{dictionary.trade.kicker}</p>
            <h1>{dictionary.trade.title}</h1>
            <p className="trade-hero__introduction">
              {dictionary.trade.introduction}
            </p>
            <div className="trade-hero__actions">
              <Link className="button button--primary" href={`/${locale}/catalog`}>
                {dictionary.trade.browseCatalog}
              </Link>
              <Link className="button button--secondary" href={`/${locale}/contact`}>
                {dictionary.navigation.contact}
              </Link>
            </div>
          </div>

          <aside className="trade-note" aria-label={dictionary.trade.sourcingDesk}>
            <div className="trade-note__number">01</div>
            <StatusBadge status="READY_STOCK">
              {dictionary.statuses.readyStock}
            </StatusBadge>
            <h2>{dictionary.trade.latestStock}</h2>
            <p>{dictionary.trade.readyNow}</p>
            <div className="trade-note__rule" />
            <p className="trade-note__route">{dictionary.trade.exportRoute}</p>
          </aside>
        </div>
      </section>

      <section className="trade-proof" aria-label={dictionary.trade.buyingPrinciples}>
        <div className="page-shell trade-proof__grid">
          <p className="trade-proof__statement">
            {dictionary.trade.buyingPrinciples}
          </p>
          <p>{dictionary.trade.inspection}</p>
          <p>{dictionary.trade.flexibleBuying}</p>
        </div>
      </section>

      <section className="supply-routes page-shell" aria-labelledby="supply-routes-title">
        <div className="section-heading">
          <p className="eyebrow">{dictionary.navigation.catalog}</p>
          <h2 id="supply-routes-title">{dictionary.trade.latestStock}</h2>
        </div>
        <div className="supply-routes__grid">
          <Link className="supply-card" href={`/${locale}/stock-lots`}>
            <span className="supply-card__index">A — 01</span>
            <h3>{dictionary.navigation.stockLots}</h3>
            <p>{dictionary.trade.lotDescription}</p>
            <span className="supply-card__action">
              <span>{dictionary.trade.browseCatalog}</span>
              <span className="directional-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </Link>
          <Link className="supply-card supply-card--sand" href={`/${locale}/single-styles`}>
            <span className="supply-card__index">B — 02</span>
            <h3>{dictionary.navigation.singleStyles}</h3>
            <p>{dictionary.trade.styleDescription}</p>
            <span className="supply-card__action">
              <span>{dictionary.trade.browseCatalog}</span>
              <span className="directional-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </Link>
        </div>
      </section>

      <section className="trade-contact">
        <div className="page-shell trade-contact__grid">
          <div>
            <p className="eyebrow">{dictionary.trade.sourcingDesk}</p>
            <h2>{dictionary.trade.exportRoute}</h2>
          </div>
          <div>
            <p>{dictionary.trade.responseNote}</p>
            <Link className="text-link" href={`/${locale}/contact`}>
              <span>{dictionary.navigation.contact}</span>
              <span className="directional-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
