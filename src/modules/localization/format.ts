import type { SupportedLocale } from "@/modules/localization/config"

type ProductTranslation = {
  locale: string
}

export function formatProductField<Translation extends ProductTranslation>(
  product: { translations: readonly Translation[] },
  locale: SupportedLocale,
): Translation | null {
  return (
    product.translations.find((translation) => translation.locale === locale) ??
    null
  )
}
