import { getPublicMediaUrl } from "@/lib/site-url"

export const publicVariantNames = [
  "primary",
  "card",
  "thumbnail",
  "social-share",
] as const

export type PublicMediaMetadata = {
  width: number
  height: number
  variants?: Partial<Record<
    (typeof publicVariantNames)[number],
    { url: string; width: number; height: number }
  >>
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function positiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : null
}

export function projectPublicMediaMetadata(
  value: unknown,
  environment: NodeJS.ProcessEnv = process.env,
): PublicMediaMetadata | null {
  const metadata = record(value)
  if (!metadata) {
    return null
  }

  const original = metadata.version === 1
    ? record(metadata.original)
    : metadata
  if (!original) {
    return null
  }

  const width = positiveInteger(original.width)
  const height = positiveInteger(original.height)
  if (!width || !height) {
    return null
  }

  const variantsValue = record(metadata.variants)
  if (!variantsValue) {
    return { width, height }
  }

  const variants: NonNullable<PublicMediaMetadata["variants"]> = {}
  for (const name of publicVariantNames) {
    const variant = record(variantsValue[name])
    if (!variant) {
      continue
    }
    const variantWidth = positiveInteger(variant.width)
    const variantHeight = positiveInteger(variant.height)
    const url = typeof variant.url === "string"
      ? getPublicMediaUrl(variant.url, environment)
      : null
    if (!variantWidth || !variantHeight || !url) {
      continue
    }
    variants[name] = {
      url,
      width: variantWidth,
      height: variantHeight,
    }
  }

  return Object.keys(variants).length > 0
    ? { width, height, variants }
    : { width, height }
}
