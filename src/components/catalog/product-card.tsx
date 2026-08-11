/* eslint-disable @next/next/no-img-element -- Media hosts are runtime-managed and cannot be allowlisted at build time. */
import type { ProductStatus } from "@prisma/client"
import Link from "next/link"

import { AddToInquiryButton } from "@/components/inquiries/add-to-inquiry-button"
import { StatusBadge, type PublicProductStatus } from "@/components/ui/status-badge"
import { getPublicMediaUrl } from "@/lib/site-url"
import type { PublicProductCard } from "@/modules/catalog/queries"
import type { SupportedLocale } from "@/modules/localization/config"
import type { Dictionary } from "@/modules/localization/dictionary"

function getPublicStatus(status: ProductStatus): PublicProductStatus {
  if (
    status === "READY_STOCK" ||
    status === "FACTORY_BOOKING" ||
    status === "SOLD_OUT"
  ) {
    return status
  }
  throw new Error(`Unsupported public product status: ${status}`)
}

function getStatusLabel(status: PublicProductStatus, dictionary: Dictionary) {
  if (status === "READY_STOCK") {
    return dictionary.statuses.readyStock
  }
  if (status === "FACTORY_BOOKING") {
    return dictionary.statuses.factoryBooking
  }
  return dictionary.statuses.soldOut
}

function formatNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale).format(value)
}

function formatDate(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}

function formatPrice(product: PublicProductCard, locale: SupportedLocale): string {
  if (product.priceVisibility.kind === "CONTACT_FOR_QUOTE") {
    return ""
  }

  const { currency, minimum, maximum, basis } = product.priceVisibility
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
  })
  const range = minimum === maximum
    ? formatter.format(Number(minimum))
    : `${formatter.format(Number(minimum))}–${formatter.format(Number(maximum))}`

  return basis ? `${range} / ${basis}` : range
}

function getStoredMediaUrl(product: PublicProductCard): string | null {
  if (
    product.primaryMedia?.mediaType !== "IMAGE" ||
    product.primaryMedia.url.startsWith("/seed-media/")
  ) {
    return null
  }
  return getPublicMediaUrl(product.primaryMedia.url)
}

type ProductCardProps = {
  product: PublicProductCard
  locale: SupportedLocale
  dictionary: Dictionary
}

export function ProductCard({ product, locale, dictionary }: ProductCardProps) {
  const status = getPublicStatus(product.status)
  const detailHref = `/${locale}/products/${encodeURIComponent(product.code)}`
  const quantity =
    product.quantitySummary.totalPieces ?? product.quantitySummary.availableQuantity
  const price = formatPrice(product, locale)
  const storedMediaUrl = getStoredMediaUrl(product)

  return (
    <article className="product-card" data-testid="product-card">
      <div className="product-card__media">
        {storedMediaUrl ? (
          <img
            src={storedMediaUrl}
            alt={product.primaryMedia!.alt ?? product.title}
            loading="lazy"
          />
        ) : (
          <div className="media-record" aria-label={dictionary.catalog.pendingMedia}>
            <span className="media-record__code" aria-hidden="true">
              MEDIA / {product.code}
            </span>
            <span className="media-record__mark" aria-hidden="true">HS</span>
            <strong>{dictionary.catalog.pendingMedia}</strong>
          </div>
        )}
        <span className="product-card__type">
          {product.type === "STOCK_LOT"
            ? dictionary.catalog.stockLot
            : dictionary.catalog.singleStyle}
        </span>
      </div>

      <div className="product-card__body">
        <div className="product-card__ledger">
          <StatusBadge status={status}>{getStatusLabel(status, dictionary)}</StatusBadge>
          <span>{dictionary.catalog.code} · {product.code}</span>
        </div>
        <h2>
          <Link href={detailHref}>{product.title}</Link>
        </h2>
        <p className="product-card__summary">{product.summary}</p>

        <dl className="product-card__facts">
          {quantity !== null ? (
            <div>
              <dt>{dictionary.catalog.quantity}</dt>
              <dd>{formatNumber(quantity, locale)} {dictionary.catalog.pieces}</dd>
            </div>
          ) : null}
          {product.quantitySummary.totalPackages !== null ? (
            <div>
              <dt>{dictionary.catalog.packages}</dt>
              <dd>{formatNumber(product.quantitySummary.totalPackages, locale)}</dd>
            </div>
          ) : null}
          {product.minimumOrderQuantity !== null ? (
            <div>
              <dt>{dictionary.catalog.moq}</dt>
              <dd>{formatNumber(product.minimumOrderQuantity, locale)} {product.purchaseUnit}</dd>
            </div>
          ) : null}
          {product.quantitySummary.factoryLeadTimeDays !== null ? (
            <div>
              <dt>{dictionary.catalog.leadTime}</dt>
              <dd>{formatNumber(product.quantitySummary.factoryLeadTimeDays, locale)} {dictionary.catalog.days}</dd>
            </div>
          ) : null}
        </dl>

        <div className="product-card__footer">
          <div>
            <span className="product-card__price">
              {price || dictionary.catalog.contactQuote}
            </span>
            {product.lastVerifiedAt ? (
              <span className="product-card__verified">
                {dictionary.catalog.verified}: {formatDate(product.lastVerifiedAt, locale)}
              </span>
            ) : null}
          </div>
          <div className="product-card__actions">
            {product.canAddToInquiry ? (
              <AddToInquiryButton
                productId={product.id}
                code={product.code}
                locale={locale}
                placement="product_card"
                className="button button--primary product-card__inquiry-button"
              />
            ) : null}
            <Link className="product-card__detail-link" href={detailHref}>
              <span>{dictionary.catalog.viewDetails}</span>
              <span className="directional-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
