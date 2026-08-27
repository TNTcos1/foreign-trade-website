import Link from "next/link"

import { ProductCard } from "@/components/catalog/product-card"
import { ContentBody } from "@/components/content/content-body"
import type { LocalizedMarketPage } from "@/modules/content/queries"
import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

export function MarketPageView({
  page,
  locale,
}: {
  page: LocalizedMarketPage
  locale: SupportedLocale
}) {
  const dictionary = getDictionary(locale)
  const copy = locale === "ar"
    ? {
        eyebrow: "دليل سوق التصدير",
        selected: "مخزون مختار لهذا السوق",
        selectedDescription: "منتجات منشورة ومترجمة ومتاحة للمراجعة في هذه اللغة.",
        inquiry: "أرسل متطلبات هذا السوق",
        allStock: "تصفح كل المخزون",
      }
    : {
        eyebrow: "Export market brief",
        selected: "Selected stock for this market",
        selectedDescription: "Published, localized products currently available for review in this language.",
        inquiry: "Send this market requirement",
        allStock: "Browse all stock",
      }

  return (
    <main id="main-content" tabIndex={-1} data-market-code={page.marketCode}>
      <header className="catalog-hero content-hero market-hero">
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

      <section className="market-products page-shell" aria-labelledby="market-products-title">
        <div className="section-heading market-products__heading">
          <p className="eyebrow">{copy.selectedDescription}</p>
          <h2 id="market-products-title">{copy.selected}</h2>
        </div>
        {page.featuredProducts.length > 0 ? (
          <div className="catalog-grid">
            {page.featuredProducts.map((product) => (
              <ProductCard
                product={product}
                locale={locale}
                dictionary={dictionary}
                key={product.id}
              />
            ))}
          </div>
        ) : (
          <p>{dictionary.catalog.noResults}</p>
        )}
      </section>

      <section className="trade-contact">
        <div className="page-shell trade-contact__grid">
          <div>
            <p className="eyebrow">{dictionary.trade.sourcingDesk}</p>
            <h2>{copy.inquiry}</h2>
          </div>
          <div>
            <p>{dictionary.trade.responseNote}</p>
            <Link
              className="button button--secondary market-inquiry-link"
              href={`/${locale}/inquiry?market=${encodeURIComponent(page.marketCode)}&channel=market-page`}
            >
              {copy.inquiry}
            </Link>
            <Link className="text-link" href={`/${locale}/catalog`}>
              <span>{copy.allStock}</span>
              <span className="directional-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
