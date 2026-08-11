import { AddToInquiryButton } from "@/components/inquiries/add-to-inquiry-button"
import { TrackedWhatsAppLink } from "@/components/inquiries/tracked-whatsapp-link"
import { createWhatsAppUrl } from "@/lib/whatsapp"
import type { PublicProduct } from "@/modules/catalog/queries"
import type { SupportedLocale } from "@/modules/localization/config"
import type { Dictionary } from "@/modules/localization/dictionary"

function formatReferencePrice(product: PublicProduct, locale: SupportedLocale): string {
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
  const price = minimum === maximum
    ? formatter.format(Number(minimum))
    : `${formatter.format(Number(minimum))}–${formatter.format(Number(maximum))}`

  return basis ? `${price} / ${basis}` : price
}

type InquiryActionsProps = {
  product: PublicProduct
  locale: SupportedLocale
  dictionary: Dictionary
}

export function InquiryActions({ product, locale, dictionary }: InquiryActionsProps) {
  const referencePrice = formatReferencePrice(product, locale)
  const whatsappUrl = createWhatsAppUrl(dictionary.product.whatsappProductMessage(product.code))

  return (
    <aside className="inquiry-actions" aria-label={dictionary.product.purchaseTerms}>
      {referencePrice ? (
        <span className="inquiry-actions__label">
          {dictionary.product.referencePrice}
        </span>
      ) : null}
      <strong className="inquiry-actions__price">
        {referencePrice || dictionary.catalog.contactQuote}
      </strong>
      {referencePrice ? (
        <p>{dictionary.product.priceDisclaimer}</p>
      ) : null}

      {product.canAddToInquiry ? (
        <div className="inquiry-actions__buttons">
          <AddToInquiryButton
            productId={product.id}
            code={product.code}
            locale={locale}
            placement="product_detail"
          />
          {whatsappUrl ? (
            <TrackedWhatsAppLink
              className="button button--secondary"
              href={whatsappUrl}
              locale={locale}
              placement="product_detail"
            >
              {dictionary.product.askWhatsapp}
            </TrackedWhatsAppLink>
          ) : (
            <p className="inquiry-actions__whatsapp-unavailable">
              {dictionary.product.whatsappUnavailable}
            </p>
          )}
        </div>
      ) : (
        <p className="inquiry-actions__unavailable">{dictionary.product.unavailable}</p>
      )}
    </aside>
  )
}
