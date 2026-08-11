import Link from "next/link"

import { ContentBody } from "@/components/content/content-body"
import { marketSlugs } from "@/modules/content/config"
import type { LocalizedContentPage } from "@/modules/content/queries"
import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

const marketLabels = {
  "middle-east": { en: "Middle East", ar: "الشرق الأوسط" },
  yemen: { en: "Yemen", ar: "اليمن" },
  india: { en: "India", ar: "الهند" },
  "central-asia": { en: "Central Asia", ar: "آسيا الوسطى" },
  "south-asia": { en: "South Asia", ar: "جنوب آسيا" },
} as const

export function ContentPageView({
  page,
  locale,
}: {
  page: LocalizedContentPage
  locale: SupportedLocale
}) {
  const dictionary = getDictionary(locale)
  const copy = locale === "ar"
    ? {
        eyebrow: "سجل التجارة والتوريد",
        markets: "الأسواق التي نخدمها",
        marketsDescription: "إرشادات محلية للمشترين مع نفس حدود التحقق والتصدير.",
        inquiry: "ابدأ طلب سعر منظم",
        privacy: "إشعار الخصوصية",
      }
    : {
        eyebrow: "Trade and supply record",
        markets: "Markets we serve",
        marketsDescription: "Localized buyer guidance with the same verification and export boundaries.",
        inquiry: "Start a structured inquiry",
        privacy: "Privacy notice",
      }

  return (
    <main id="main-content" tabIndex={-1}>
      <header className="catalog-hero content-hero">
        <div className="page-shell catalog-hero__grid">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{page.title}</h1>
          </div>
          <div className="catalog-hero__brief">
            {page.summary ? <p>{page.summary}</p> : null}
            <span>{dictionary.trade.exportRoute}</span>
          </div>
        </div>
      </header>

      <div className="page-shell content-ledger">
        <ContentBody body={page.body} />
      </div>

      <section className="content-markets" aria-labelledby="content-markets-title">
        <div className="page-shell">
          <div className="section-heading content-markets__heading">
            <p className="eyebrow">{copy.marketsDescription}</p>
            <h2 id="content-markets-title">{copy.markets}</h2>
          </div>
          <nav className="market-link-grid" aria-label={copy.markets}>
            {marketSlugs.map((slug, index) => (
              <Link href={`/${locale}/markets/${slug}`} key={slug}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{marketLabels[slug][locale]}</strong>
                <span className="directional-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="trade-contact">
        <div className="page-shell trade-contact__grid">
          <div>
            <p className="eyebrow">{dictionary.trade.sourcingDesk}</p>
            <h2>{copy.inquiry}</h2>
          </div>
          <div>
            <p>{dictionary.trade.responseNote}</p>
            <Link className="text-link" href={`/${locale}/inquiry`}>
              <span>{copy.inquiry}</span>
              <span className="directional-arrow" aria-hidden="true">→</span>
            </Link>
            <Link className="text-link content-privacy-link" href={`/${locale}/privacy`}>
              {copy.privacy}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
