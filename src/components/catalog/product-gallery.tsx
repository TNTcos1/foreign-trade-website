/* eslint-disable @next/next/no-img-element -- Media hosts are runtime-managed and cannot be allowlisted at build time. */
import { getPublicMediaUrl } from "@/lib/site-url"
import type { PublicProductMedia } from "@/modules/catalog/queries"
import type { Dictionary } from "@/modules/localization/dictionary"

function isSeedPlaceholder(media: PublicProductMedia): boolean {
  return media.url.startsWith("/seed-media/")
}

type ProductGalleryProps = {
  code: string
  media: PublicProductMedia[]
  dictionary: Dictionary
}

export function ProductGallery({ code, media, dictionary }: ProductGalleryProps) {
  const images = media
    .filter((item) => item.mediaType === "IMAGE" && !isSeedPlaceholder(item))
    .map((item) => ({ ...item, publicUrl: getPublicMediaUrl(item.url) }))
    .filter((item): item is typeof item & { publicUrl: string } => item.publicUrl !== null)

  return (
    <section
      className="product-gallery"
      aria-label={dictionary.product.mediaRegion}
    >
      <div className="product-gallery__heading">
        <p className="eyebrow">{dictionary.product.conditionProof}</p>
        <span>{code}</span>
      </div>

      {images.length > 0 ? (
        <div className="product-gallery__grid">
          {images.map((image, index) => (
            <figure
              className={index === 0 ? "product-gallery__item product-gallery__item--primary" : "product-gallery__item"}
              key={image.id}
            >
              <img
                src={image.publicUrl}
                alt={image.alt ?? ""}
                loading={index === 0 ? "eager" : "lazy"}
              />
            </figure>
          ))}
        </div>
      ) : (
        <div className="product-gallery__pending">
          <span className="product-gallery__stamp" aria-hidden="true">HS / EVIDENCE</span>
          <span className="product-gallery__monogram" aria-hidden="true">{code.slice(-3)}</span>
          <div>
            <strong className="product-gallery__pending-title">
              {dictionary.catalog.pendingMedia}
            </strong>
            <p>{dictionary.catalog.pendingMediaDescription}</p>
          </div>
        </div>
      )}
    </section>
  )
}
