type WhatsAppConfiguration = {
  baseUrl?: string
  number?: string
}

export function createWhatsAppUrl(
  message: string,
  configuration: WhatsAppConfiguration = {
    baseUrl: process.env.WHATSAPP_BASE_URL,
    number: process.env.WHATSAPP_NUMBER,
  },
): string | null {
  const baseUrl = configuration.baseUrl?.trim()
  const number = configuration.number?.trim()
  if (!baseUrl || !number || !/^\d{7,15}$/.test(number)) {
    return null
  }

  try {
    const url = new URL(baseUrl)
    if (url.protocol !== "https:" || url.username || url.password) {
      return null
    }
    const normalizedPath = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`
    url.pathname = `${normalizedPath}${number}`
    url.search = ""
    url.hash = ""
    url.searchParams.set("text", message)
    return url.toString()
  } catch {
    return null
  }
}
