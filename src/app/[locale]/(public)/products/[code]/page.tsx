import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { InquiryActions } from "@/components/catalog/inquiry-actions"
import { ProductCard } from "@/components/catalog/product-card"
import { ProductFacts } from "@/components/catalog/product-facts"
import { ProductGallery } from "@/components/catalog/product-gallery"
import { StatusBadge, type PublicProductStatus } from "@/components/ui/status-badge"
import { getAbsoluteSiteUrl, getPublicMediaUrl } from "@/lib/site-url"
import { createProductJsonLd, getPublicProductByCode } from "@/modules/catalog/queries"
import { isSupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

export const dynamic = "force-dynamic"

type ProductPageProps = {
  params: Promise<{ locale: string; code: string }>
}

function getStatusLabel(status: PublicProductStatus, locale: "en" | "ar") {
  const dictionary = getDictionary(locale)
  if (status === "READY_STOCK") {
    return dictionary.statuses.readyStock
  }
  if (status === "FACTORY_BOOKING") {
    return dictionary.statuses.factoryBooking
  }
  return dictionary.statuses.soldOut
}

function getPublicStatus(status: string): PublicProductStatus {
  if (
    status === "READY_STOCK" ||
    status === "FACTORY_BOOKING" ||
    status === "SOLD_OUT"
  ) {
    return status
  }
  throw new Error(`Unsupported public product status: ${status}`)
}

function formatVerifiedDate(value: string, locale: "en" | "ar"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, code } = await params
  if (!isSupportedLocale(locale)) {
    return {}
  }
  const product = await getPublicProductByCode(code, locale)
  if (!product) {
    return {}
  }

  const canonicalPath = `/${locale}/products/${encodeURIComponent(product.code)}`
  const canonical = getAbsoluteSiteUrl(canonicalPath)
  const alternateOpenGraphLocales = product.availableLocales
    .filter((availableLocale) => availableLocale !== locale)
    .map((availableLocale) => availableLocale === "ar" ? "ar_AR" : "en_US")
  const image = product.media
    .filter((media) => media.mediaType === "IMAGE" && !media.url.startsWith("/seed-media/"))
    .map((media) => getPublicMediaUrl(media.url))
    .find((url): url is string => url !== null)

  return {
    title: product.seo.title ?? product.title,
    description: product.seo.description ?? product.summary,
    alternates: {
      canonical,
      languages: Object.fromEntries(
        product.availableLocales.map((availableLocale) => [
          availableLocale,
          getAbsoluteSiteUrl(
            `/${availableLocale}/products/${encodeURIComponent(product.code)}`,
          ),
        ]),
      ),
    },
    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_AR" : "en_US",
      alternateLocale: alternateOpenGraphLocales,
      url: canonical,
      title: product.seo.title ?? product.title,
      description: product.seo.description ?? product.summary,
      siteName: locale === "ar" ? "هاربور ستوك" : "Harbor Stock",
      ...(image ? { images: [{ url: image, alt: product.seo.shareImageAlt ?? product.title }] } : {}),
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, code } = await params
  if (!isSupportedLocale(locale)) {
    notFound()
  }

  const product = await getPublicProductByCode(code, locale)
  if (!product) {
    notFound()
  }

  const dictionary = getDictionary(locale)
  const status = getPublicStatus(product.status)
  const jsonLd = JSON.stringify(createProductJsonLd(product, locale)).replace(/</g, "\\u003c")

  return (
    <main id="main-content" tabIndex={-1}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <div className="page-shell product-evidence">
        <ProductGallery code={product.code} media={product.media} dictionary={dictionary} />
      </div>

      <header className="product-heading">
        <div className="page-shell product-heading__grid">
          <div className="product-heading__identity">
            <Link className="product-heading__back" href={`/${locale}/stock`}>
              <span className="directional-arrow" aria-hidden="true">←</span>
              <span>{dictionary.product.backToStock}</span>
            </Link>
            <div className="product-heading__status">
              <StatusBadge status={status}>{getStatusLabel(status, locale)}</StatusBadge>
              <span>{dictionary.catalog.code} · {product.code}</span>
            </div>
            <h1>{product.title}</h1>
            <p>{product.summary}</p>
            {product.lastVerifiedAt ? (
              <span className="product-heading__verified">
                {dictionary.catalog.verified} {formatVerifiedDate(product.lastVerifiedAt, locale)}
              </span>
            ) : null}
          </div>
          <InquiryActions product={product} locale={locale} dictionary={dictionary} />
        </div>
      </header>

      <div className="page-shell product-detail">
        <section className="product-description" aria-labelledby="product-description-title">
          <p className="eyebrow">{dictionary.catalog.verified}</p>
          <h2 id="product-description-title">{product.title}</h2>
          <p>{product.description}</p>
        </section>
        <ProductFacts product={product} locale={locale} dictionary={dictionary} />
      </div>

      {product.relatedProducts.length > 0 ? (
        <section className="related-products">
          <div className="page-shell">
            <div className="section-heading">
              <p className="eyebrow">{dictionary.catalog.title}</p>
              <h2>{dictionary.product.related}</h2>
            </div>
            <div className="catalog-grid">
              {product.relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  locale={locale}
                  dictionary={dictionary}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}
