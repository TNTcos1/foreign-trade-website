export const publicContentSlugs = ["why-us", "how-to-buy", "contact"] as const

export const marketSlugs = [
  "middle-east",
  "yemen",
  "india",
  "central-asia",
  "south-asia",
] as const

export type MarketSlug = (typeof marketSlugs)[number]

export function isMarketSlug(value: string): value is MarketSlug {
  return marketSlugs.some((slug) => slug === value)
}
