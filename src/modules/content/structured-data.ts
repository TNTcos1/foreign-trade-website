import { getAbsoluteSiteUrl } from "@/lib/site-url"
import type { SerializableJson } from "@/modules/catalog/queries"
import type { SupportedLocale } from "@/modules/localization/config"

export function createOrganizationJsonLd(
  locale: SupportedLocale,
): { [key: string]: SerializableJson } {
  const url = getAbsoluteSiteUrl(`/${locale}`)

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${getAbsoluteSiteUrl("/")}#organization`,
    name: locale === "ar" ? "هاربور ستوك" : "Harbor Stock",
    url,
    description: locale === "ar"
      ? "توريد ملابس التصفية بالجملة مع التحقق في تشيوانتشو وتجهيز التصدير عبر ميناء شيامن."
      : "Wholesale clearance clothing supply with Quanzhou verification and export preparation through Xiamen Port.",
    areaServed: [
      "Middle East",
      "Yemen",
      "India",
      "Central Asia",
      "South Asia",
    ],
    knowsAbout: [
      "Wholesale clothing clearance",
      "Stock lot inspection",
      "Factory booking",
      "Export preparation",
    ],
  }
}
