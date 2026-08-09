"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import type { CatalogFilters } from "@/modules/catalog/filters"

type CatalogFilterCopy = {
  filterStock: string
  searchLabel: string
  searchPlaceholder: string
  typeLabel: string
  allTypes: string
  stockLot: string
  singleStyle: string
  statusLabel: string
  allStatuses: string
  categoryLabel: string
  genderAgeLabel: string
  seasonLabel: string
  purchaseUnitLabel: string
  minMoqLabel: string
  maxMoqLabel: string
  minPriceLabel: string
  maxPriceLabel: string
  sortLabel: string
  latest: string
  priceLow: string
  priceHigh: string
  moqLow: string
  apply: string
  clear: string
  statuses: {
    readyStock: string
    factoryBooking: string
    soldOut: string
  }
}

type CatalogFiltersProps = {
  action: string
  filters: CatalogFilters
  copy: CatalogFilterCopy
  showProductType: boolean
}

export function CatalogFilterPanel({
  action,
  filters,
  copy,
  showProductType,
}: CatalogFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 52rem)")
    const synchronize = () => setIsOpen(desktopQuery.matches)
    synchronize()
    desktopQuery.addEventListener("change", synchronize)
    return () => desktopQuery.removeEventListener("change", synchronize)
  }, [])

  return (
    <details
      className="catalog-filter-panel"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>{copy.filterStock}</summary>
      <form className="catalog-filter-form" action={action} method="get">
        <div className="catalog-filter-form__field catalog-filter-form__field--wide">
          <label htmlFor="catalog-search">{copy.searchLabel}</label>
          <input
            id="catalog-search"
            name="search"
            type="search"
            defaultValue={filters.search}
            placeholder={copy.searchPlaceholder}
          />
        </div>

        {showProductType ? (
          <div className="catalog-filter-form__field">
            <label htmlFor="catalog-type">{copy.typeLabel}</label>
            <select id="catalog-type" name="type" defaultValue={filters.type ?? ""}>
              <option value="">{copy.allTypes}</option>
              <option value="STOCK_LOT">{copy.stockLot}</option>
              <option value="SINGLE_STYLE">{copy.singleStyle}</option>
            </select>
          </div>
        ) : null}

        <div className="catalog-filter-form__field">
          <label htmlFor="catalog-status">{copy.statusLabel}</label>
          <select id="catalog-status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">{copy.allStatuses}</option>
            <option value="READY_STOCK">{copy.statuses.readyStock}</option>
            <option value="FACTORY_BOOKING">{copy.statuses.factoryBooking}</option>
            <option value="SOLD_OUT">{copy.statuses.soldOut}</option>
          </select>
        </div>

        <div className="catalog-filter-form__field">
          <label htmlFor="catalog-category">{copy.categoryLabel}</label>
          <input id="catalog-category" name="category" defaultValue={filters.category} />
        </div>

        <div className="catalog-filter-form__field">
          <label htmlFor="catalog-gender-age">{copy.genderAgeLabel}</label>
          <input id="catalog-gender-age" name="genderAge" defaultValue={filters.genderAge} />
        </div>

        <div className="catalog-filter-form__field">
          <label htmlFor="catalog-season">{copy.seasonLabel}</label>
          <input id="catalog-season" name="season" defaultValue={filters.season} />
        </div>

        <div className="catalog-filter-form__field">
          <label htmlFor="catalog-unit">{copy.purchaseUnitLabel}</label>
          <input id="catalog-unit" name="purchaseUnit" defaultValue={filters.purchaseUnit} />
        </div>

        <div className="catalog-filter-form__field">
          <label htmlFor="catalog-min-moq">{copy.minMoqLabel}</label>
          <input id="catalog-min-moq" name="minMoq" type="number" min="0" step="1" defaultValue={filters.minMoq} />
        </div>

        <div className="catalog-filter-form__field">
          <label htmlFor="catalog-max-moq">{copy.maxMoqLabel}</label>
          <input id="catalog-max-moq" name="maxMoq" type="number" min="0" step="1" defaultValue={filters.maxMoq} />
        </div>

        <div className="catalog-filter-form__field">
          <label htmlFor="catalog-min-price">{copy.minPriceLabel}</label>
          <input id="catalog-min-price" name="minPrice" type="number" min="0" step="0.01" defaultValue={filters.minPrice} />
        </div>

        <div className="catalog-filter-form__field">
          <label htmlFor="catalog-max-price">{copy.maxPriceLabel}</label>
          <input id="catalog-max-price" name="maxPrice" type="number" min="0" step="0.01" defaultValue={filters.maxPrice} />
        </div>

        <div className="catalog-filter-form__field catalog-filter-form__field--wide">
          <label htmlFor="catalog-sort">{copy.sortLabel}</label>
          <select id="catalog-sort" name="sort" defaultValue={filters.sort}>
            <option value="LATEST">{copy.latest}</option>
            <option value="PRICE_ASC">{copy.priceLow}</option>
            <option value="PRICE_DESC">{copy.priceHigh}</option>
            <option value="MOQ_ASC">{copy.moqLow}</option>
          </select>
        </div>

        <div className="catalog-filter-form__actions">
          <button className="button button--primary" type="submit">
            {copy.apply}
          </button>
          <Link className="button catalog-filter-form__clear" href={action}>
            {copy.clear}
          </Link>
        </div>
      </form>
    </details>
  )
}
