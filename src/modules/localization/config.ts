export const supportedLocales = ["en", "ar"] as const

export type SupportedLocale = (typeof supportedLocales)[number]

export const defaultLocale: SupportedLocale = "en"

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.some((supportedLocale) => supportedLocale === locale)
}

export function isRtlLocale(locale: string): boolean {
  return locale === "ar"
}

export function localizePath(
  locale: SupportedLocale,
  pathname: string,
): string {
  const url = new URL(pathname, "https://local.invalid")
  const segments = url.pathname.split("/").filter(Boolean)

  if (segments[0] && isSupportedLocale(segments[0])) {
    segments[0] = locale
  } else {
    segments.unshift(locale)
  }

  return `/${segments.join("/")}${url.search}${url.hash}`
}
