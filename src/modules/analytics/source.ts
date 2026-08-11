import type { NormalizedSourceContext } from "@/modules/inquiries/validation"
import { isSupportedLocale, type SupportedLocale } from "@/modules/localization/config"

function clean(value: string | null, maximum: number): string | null {
  if (!value) {
    return null
  }
  const normalized = value.trim().slice(0, maximum)
  return /^[\p{L}\p{N}._:/-]+$/u.test(normalized) ? normalized : null
}

function localeFromPath(pathname: string): SupportedLocale | null {
  const locale = pathname.split("/").filter(Boolean)[0]
  return locale && isSupportedLocale(locale) ? locale : null
}

function marketFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/(?:en|ar)\/markets\/([^/]+)\/?$/)
  return clean(match?.[1] ?? null, 120)
}

function productFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/(?:en|ar)\/products\/([^/]+)\/?$/)
  if (!match?.[1]) {
    return null
  }
  try {
    return clean(decodeURIComponent(match[1]), 120)
  } catch {
    return null
  }
}

export function parseSourceContext(
  location: string,
  referrer: string,
  sessionId: string,
): NormalizedSourceContext {
  const url = new URL(location, "https://local.invalid")
  const source = clean(url.searchParams.get("utm_source"), 120)
  const campaign = clean(url.searchParams.get("utm_campaign"), 120)
  const medium = clean(url.searchParams.get("utm_medium"), 120)
  const channel = clean(url.searchParams.get("channel"), 64) ?? source ?? "direct"

  let safeReferrer: string | null = null
  try {
    const referrerUrl = new URL(referrer)
    if (referrerUrl.protocol === "http:" || referrerUrl.protocol === "https:") {
      safeReferrer = `${referrerUrl.origin}${referrerUrl.pathname}`.slice(0, 500)
    }
  } catch {
    safeReferrer = null
  }

  return {
    sessionId,
    locale: localeFromPath(url.pathname),
    channel,
    campaign,
    source,
    medium,
    landingPage: url.pathname,
    firstProductCode: clean(url.searchParams.get("product"), 120) ?? productFromPath(url.pathname),
    marketCode: marketFromPath(url.pathname),
    referrer: safeReferrer,
  }
}
