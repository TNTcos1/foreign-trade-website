import type { MetadataRoute } from "next"

import { getAbsoluteSiteUrl } from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/*/admin/",
        "/*/inquiry/success",
        "/*/catalog?*",
        "/*/stock?*",
        "/*/stock-lots?*",
        "/*/single-styles?*",
      ],
    },
    sitemap: getAbsoluteSiteUrl("/sitemap.xml"),
  }
}
