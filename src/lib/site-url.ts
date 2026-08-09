const fallbackOrigin = "http://localhost:3000"

export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (!configured) {
    return fallbackOrigin
  }

  try {
    const url = new URL(configured)
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return fallbackOrigin
    }
    return url.origin
  } catch {
    return fallbackOrigin
  }
}

export function getAbsoluteSiteUrl(pathname: string): string {
  return new URL(pathname, getSiteOrigin()).toString()
}

export function getPublicMediaUrl(value: string): string | null {
  try {
    const url = new URL(value, getSiteOrigin())
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}
