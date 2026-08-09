import type { ProductType } from "@prisma/client"
import Link from "next/link"

import { CatalogFilterPanel } from "@/components/catalog/catalog-filters"
import { ProductCard } from "@/components/catalog/product-card"
import {
  parseCatalogFilters,
  type CatalogFilters,
  type CatalogSearchParams,
} from "@/modules/catalog/filters"
import { listPublicProducts } from "@/modules/catalog/queries"
import type { SupportedLocale } from "@/modules/localization/config"
import type { Dictionary } from "@/modules/localization/dictionary"

function getPageHref(
  action: string,
  searchParams: CatalogSearchParams,
  page: number,
): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || typeof value !== "string" || value.length === 0) {
      continue
    }
    query.set(key, value)
  }
  if (page > 1) {
    query.set("page", String(page))
  }
  const suffix = query.toString()
  return suffix ? `${action}?${suffix}` : action
}

function withFixedType(
  filters: CatalogFilters,
  fixedType: ProductType | undefined,
): CatalogFilters {
  return fixedType ? { ...filters, type: fixedType } : filters
}

type CatalogPageProps = {
  locale: SupportedLocale
  dictionary: Dictionary
  action: string
  title: string
  description: string
  searchParams: CatalogSearchParams
  fixedType?: ProductType
}

export async function CatalogPage({
  locale,
  dictionary,
  action,
  title,
  description,
  searchParams,
  fixedType,
}: CatalogPageProps) {
  const filters = withFixedType(parseCatalogFilters(searchParams), fixedType)
  const catalog = await listPublicProducts(filters, locale)

  return (
    <main id="main-content" tabIndex={-1}>
      <header className="catalog-hero">
        <div className="page-shell catalog-hero__grid">
          <div>
            <p className="eyebrow">{dictionary.catalog.eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="catalog-hero__brief">
            <p>{description}</p>
            <span>{dictionary.trade.exportRoute}</span>
          </div>
        </div>
      </header>

      <section className="catalog-ledger page-shell" aria-labelledby="catalog-results-title">
        <div className="catalog-ledger__toolbar">
          <h2 id="catalog-results-title">
            {dictionary.catalog.resultCount(catalog.total)}
          </h2>
          <span>{dictionary.catalog.latest}</span>
        </div>

        <CatalogFilterPanel
          action={action}
          filters={filters}
          copy={{
            filterStock: dictionary.catalog.filterStock,
            searchLabel: dictionary.catalog.searchLabel,
            searchPlaceholder: dictionary.catalog.searchPlaceholder,
            typeLabel: dictionary.catalog.typeLabel,
            allTypes: dictionary.catalog.allTypes,
            stockLot: dictionary.catalog.stockLot,
            singleStyle: dictionary.catalog.singleStyle,
            statusLabel: dictionary.catalog.statusLabel,
            allStatuses: dictionary.catalog.allStatuses,
            categoryLabel: dictionary.catalog.categoryLabel,
            genderAgeLabel: dictionary.catalog.genderAgeLabel,
            seasonLabel: dictionary.catalog.seasonLabel,
            purchaseUnitLabel: dictionary.catalog.purchaseUnitLabel,
            minMoqLabel: dictionary.catalog.minMoqLabel,
            maxMoqLabel: dictionary.catalog.maxMoqLabel,
            minPriceLabel: dictionary.catalog.minPriceLabel,
            maxPriceLabel: dictionary.catalog.maxPriceLabel,
            sortLabel: dictionary.catalog.sortLabel,
            latest: dictionary.catalog.latest,
            priceLow: dictionary.catalog.priceLow,
            priceHigh: dictionary.catalog.priceHigh,
            moqLow: dictionary.catalog.moqLow,
            apply: dictionary.catalog.apply,
            clear: dictionary.catalog.clear,
            statuses: {
              readyStock: dictionary.statuses.readyStock,
              factoryBooking: dictionary.statuses.factoryBooking,
              soldOut: dictionary.statuses.soldOut,
            },
          }}
          showProductType={!fixedType}
        />

        {catalog.items.length > 0 ? (
          <div className="catalog-grid">
            {catalog.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                dictionary={dictionary}
              />
            ))}
          </div>
        ) : (
          <div className="catalog-empty">
            <span aria-hidden="true">00</span>
            <div>
              <h2>{dictionary.catalog.noResultsTitle}</h2>
              <p>{dictionary.catalog.noResults}</p>
              <Link className="button catalog-filter-form__clear" href={action}>
                {dictionary.catalog.clear}
              </Link>
            </div>
          </div>
        )}

        {catalog.totalPages > 1 ? (
          <nav className="catalog-pagination" aria-label={dictionary.catalog.page(catalog.page, catalog.totalPages)}>
            {catalog.page > 1 ? (
              <Link href={getPageHref(action, searchParams, catalog.page - 1)}>
                <span className="directional-arrow" aria-hidden="true">←</span>
                <span>{dictionary.catalog.previous}</span>
              </Link>
            ) : <span />}
            <span>{dictionary.catalog.page(catalog.page, catalog.totalPages)}</span>
            {catalog.page < catalog.totalPages ? (
              <Link href={getPageHref(action, searchParams, catalog.page + 1)}>
                <span>{dictionary.catalog.next}</span>
                <span className="directional-arrow" aria-hidden="true">→</span>
              </Link>
            ) : <span />}
          </nav>
        ) : null}
      </section>
    </main>
  )
}
