const fallbackOrigin = "http://localhost:3000"

function safeHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null
    }
    return url
  } catch {
    return null
  }
}

export function getSiteOrigin(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const configured = environment.NEXT_PUBLIC_SITE_URL
  return configured
    ? safeHttpUrl(configured)?.origin ?? fallbackOrigin
    : fallbackOrigin
}

export function getAbsoluteSiteUrl(pathname: string): string {
  return new URL(pathname, getSiteOrigin()).toString()
}

function configuredMediaBase(environment: NodeJS.ProcessEnv): URL | null {
  const configured = environment.STORAGE_PUBLIC_URL?.trim()
  return configured ? safeHttpUrl(configured) : null
}

function isUnderPath(pathname: string, basePathname: string): boolean {
  const prefix = basePathname.endsWith("/")
    ? basePathname
    : `${basePathname}/`
  return pathname === basePathname || pathname.startsWith(prefix)
}

export function getPublicMediaUrl(
  value: string,
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  try {
    const siteOrigin = getSiteOrigin(environment)
    const url = new URL(value, siteOrigin)
    const mediaBase = configuredMediaBase(environment)
    const sameSite = url.origin === siteOrigin
    const configuredMedia = mediaBase !== null &&
      url.origin === mediaBase.origin &&
      isUnderPath(url.pathname, mediaBase.pathname)
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      (!sameSite && !configuredMedia)
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}
