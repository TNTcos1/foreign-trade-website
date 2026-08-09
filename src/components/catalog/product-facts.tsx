import type { ReactNode } from "react"

import type { PublicProduct, SerializableJson } from "@/modules/catalog/queries"
import type { SupportedLocale } from "@/modules/localization/config"
import type { Dictionary } from "@/modules/localization/dictionary"

function formatNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale).format(value)
}

function formatStructuredValue(value: SerializableJson, locale: SupportedLocale): string {
  if (value === null) {
    return "—"
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatStructuredValue(item, locale)).join(" · ")
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key.replace(/([A-Z])/g, " $1")}: ${formatStructuredValue(item, locale)}`)
      .join(" · ")
  }
  if (typeof value === "number") {
    return formatNumber(value, locale)
  }
  return String(value)
}

type FactProps = {
  label: string
  children: ReactNode
}

function Fact({ label, children }: FactProps) {
  return (
    <div className="product-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

type ProductFactsProps = {
  product: PublicProduct
  locale: SupportedLocale
  dictionary: Dictionary
}

export function ProductFacts({ product, locale, dictionary }: ProductFactsProps) {
  return (
    <div className="product-information">
      <section className="product-facts" aria-labelledby="product-facts-title">
        <p className="eyebrow">{dictionary.catalog.verified}</p>
        <h2 id="product-facts-title">{dictionary.product.facts}</h2>
        <dl>
          {product.sourceType || product.sourceLocation ? (
            <Fact label={dictionary.product.source}>
              {[product.sourceType, product.sourceLocation].filter(Boolean).join(" · ")}
            </Fact>
          ) : null}
          {product.qualityGrade ? (
            <Fact label={dictionary.product.quality}>{product.qualityGrade}</Fact>
          ) : null}
          {product.clearanceReason ? (
            <Fact label={dictionary.product.clearanceReason}>{product.clearanceReason}</Fact>
          ) : null}
          {product.defectNotes ? (
            <Fact label={dictionary.product.defectNotes}>{product.defectNotes}</Fact>
          ) : null}
          <Fact label={dictionary.product.inspection}>
            {product.inspectionAvailable
              ? dictionary.product.inspectionAvailable
              : dictionary.product.inspectionUnavailable}
          </Fact>
          {product.stockLotDetails ? (
            <>
              <Fact label={dictionary.product.totalPieces}>
                {formatNumber(product.stockLotDetails.totalPieces, locale)}
              </Fact>
              {product.stockLotDetails.totalPackages !== null ? (
                <Fact label={dictionary.product.totalPackages}>
                  {formatNumber(product.stockLotDetails.totalPackages, locale)}
                </Fact>
              ) : null}
              {product.stockLotDetails.piecesPerPackage !== null ? (
                <Fact label={dictionary.product.piecesPerPackage}>
                  {formatNumber(product.stockLotDetails.piecesPerPackage, locale)}
                </Fact>
              ) : null}
              {product.stockLotDetails.totalWeightKg ? (
                <Fact label={dictionary.product.weight}>{product.stockLotDetails.totalWeightKg} kg</Fact>
              ) : null}
              {product.stockLotDetails.totalVolumeCbm ? (
                <Fact label={dictionary.product.volume}>{product.stockLotDetails.totalVolumeCbm} m³</Fact>
              ) : null}
              {product.stockLotDetails.sizeRange ? (
                <Fact label={dictionary.product.sizeRange}>{product.stockLotDetails.sizeRange}</Fact>
              ) : null}
              {product.stockLotDetails.categoryComposition ? (
                <Fact label={dictionary.product.composition}>
                  {formatStructuredValue(product.stockLotDetails.categoryComposition, locale)}
                </Fact>
              ) : null}
              {product.stockLotDetails.containerLoadEstimate ? (
                <Fact label={dictionary.product.containerEstimate}>
                  {formatStructuredValue(product.stockLotDetails.containerLoadEstimate, locale)}
                </Fact>
              ) : null}
            </>
          ) : null}
          {product.singleStyleDetails ? (
            <>
              <Fact label={dictionary.product.styleNumber}>{product.singleStyleDetails.styleNumber}</Fact>
              {product.singleStyleDetails.fabric ? (
                <Fact label={dictionary.product.fabric}>{product.singleStyleDetails.fabric}</Fact>
              ) : null}
              {product.singleStyleDetails.piecesPerCarton !== null ? (
                <Fact label={dictionary.product.piecesPerCarton}>
                  {formatNumber(product.singleStyleDetails.piecesPerCarton, locale)}
                </Fact>
              ) : null}
              {product.singleStyleDetails.factoryLeadTimeDays !== null ? (
                <Fact label={dictionary.product.factoryLeadTime}>
                  {formatNumber(product.singleStyleDetails.factoryLeadTimeDays, locale)} {dictionary.catalog.days}
                </Fact>
              ) : null}
            </>
          ) : null}
        </dl>
      </section>

      <section className="purchase-facts" aria-labelledby="purchase-facts-title">
        <p className="eyebrow">{dictionary.trade.exportRoute}</p>
        <h2 id="purchase-facts-title">{dictionary.product.purchaseTerms}</h2>
        <dl>
          {product.sourceLocation ? (
            <Fact label={dictionary.product.shippingOrigin}>{product.sourceLocation}</Fact>
          ) : null}
          {product.tradeTerms ? (
            <Fact label={dictionary.product.tradeTerms}>{product.tradeTerms}</Fact>
          ) : null}
          <Fact label={dictionary.catalog.purchaseUnitLabel}>{product.purchaseUnit}</Fact>
          {product.minimumOrderQuantity !== null ? (
            <Fact label={dictionary.catalog.moq}>
              {formatNumber(product.minimumOrderQuantity, locale)} {product.purchaseUnit}
            </Fact>
          ) : null}
          {product.availableQuantity !== null ? (
            <Fact label={dictionary.catalog.quantity}>
              {formatNumber(product.availableQuantity, locale)} {dictionary.catalog.pieces}
            </Fact>
          ) : null}
        </dl>
      </section>

      {product.variants.length > 0 ? (
        <section className="product-variants" aria-labelledby="product-variants-title">
          <h2 id="product-variants-title">{dictionary.product.variants}</h2>
          <div className="product-variants__table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{dictionary.product.sku}</th>
                  <th scope="col">{dictionary.product.color}</th>
                  <th scope="col">{dictionary.product.size}</th>
                  <th scope="col">{dictionary.catalog.quantity}</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id}>
                    <td>{variant.sku}</td>
                    <td>{variant.color}</td>
                    <td>{variant.size}</td>
                    <td>{formatNumber(variant.availableQuantity, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
