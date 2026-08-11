// @vitest-environment node

import { describe, expect, it } from "vitest"

import robots from "@/app/robots"
import { getAbsoluteSiteUrl } from "@/lib/site-url"
import { createContentMetadata } from "@/modules/content/metadata"
import type { LocalizedContentPage } from "@/modules/content/queries"
import { createOrganizationJsonLd } from "@/modules/content/structured-data"

const page: LocalizedContentPage = {
  id: "5027ec13-b6b1-4d40-88c8-92731f56a2ef",
  slug: "why-us",
  pageType: "TRUST",
  availableLocales: ["en"],
  title: "Warehouse evidence",
  summary: "Verified supply evidence",
  body: "Evidence before commitment.",
  seo: {
    title: "Wholesale supply evidence",
    description: "Quanzhou verification and Xiamen export preparation.",
  },
  publishedAt: "2026-07-31T08:00:00.000Z",
  updatedAt: "2026-08-11T08:00:00.000Z",
}

describe("public content SEO", () => {
  it("generates canonical metadata and only real language alternates", () => {
    const metadata = createContentMetadata(page, "en", "why-us")

    expect(metadata).toMatchObject({
      title: page.seo.title,
      description: page.seo.description,
      alternates: {
        canonical: getAbsoluteSiteUrl("/en/why-us"),
        languages: {
          en: getAbsoluteSiteUrl("/en/why-us"),
        },
      },
      openGraph: {
        locale: "en_US",
        alternateLocale: [],
        url: getAbsoluteSiteUrl("/en/why-us"),
      },
    })
    expect(metadata.alternates?.languages).not.toHaveProperty("ar")
  })

  it("publishes organization facts without inventing contact details", () => {
    const organization = createOrganizationJsonLd("ar")

    expect(organization).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "هاربور ستوك",
      areaServed: ["Middle East", "Yemen", "India", "Central Asia", "South Asia"],
    })
    expect(organization).not.toHaveProperty("telephone")
    expect(organization).not.toHaveProperty("email")
    expect(organization).not.toHaveProperty("sameAs")
  })

  it("keeps private routes and uncontrolled catalog facets out of crawling", () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const disallow = rules.flatMap((rule) => rule.disallow ?? [])

    expect(disallow).toEqual(expect.arrayContaining([
      "/api/",
      "/admin/",
      "/*/admin/",
      "/*/inquiry/success",
      "/*/catalog?*",
      "/*/stock?*",
      "/*/stock-lots?*",
      "/*/single-styles?*",
    ]))
    expect(result.sitemap).toBe(getAbsoluteSiteUrl("/sitemap.xml"))
  })
})
