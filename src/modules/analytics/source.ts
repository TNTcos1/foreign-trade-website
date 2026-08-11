import type { NormalizedSourceContext } from "@/modules/inquiries/validation"

function clean(value: string | null, maximum: number): string | null {
  if (!value) {
    return null
  }
  const normalized = value.trim().slice(0, maximum)
  return /^[\p{L}\p{N}._:/-]+$/u.test(normalized) ? normalized : null
}

function marketFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/(?:en|ar)\/markets\/([^/]+)\/?$/)
  return match?.[1]?.slice(0, 120) ?? null
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
    channel,
    campaign,
    source,
    medium,
    landingPage: url.pathname,
    firstProductCode: clean(url.searchParams.get("product"), 120),
    marketCode: marketFromPath(url.pathname),
    referrer: safeReferrer,
  }
}
