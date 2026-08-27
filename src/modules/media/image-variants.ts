import sharp from "sharp"

export const IMAGE_VARIANT_RECIPES = {
  primary: { width: 1_600, height: 1_600, fit: "inside" },
  card: { width: 720, height: 900, fit: "cover" },
  thumbnail: { width: 320, height: 320, fit: "cover" },
  "social-share": { width: 1_200, height: 630, fit: "cover" },
} as const

export type ImageVariantName = keyof typeof IMAGE_VARIANT_RECIPES

export type GeneratedImageVariant = {
  name: ImageVariantName
  body: Uint8Array
  contentType: "image/webp"
  extension: "webp"
  width: number
  height: number
  bytes: number
}

export async function generateImageVariants(
  body: Uint8Array,
): Promise<GeneratedImageVariant[]> {
  const source = sharp(body, { failOn: "error" }).rotate()
  const variants: GeneratedImageVariant[] = []
  for (const [name, recipe] of Object.entries(IMAGE_VARIANT_RECIPES)) {
    const { data, info } = await source
      .clone()
      .resize({
        width: recipe.width,
        height: recipe.height,
        fit: recipe.fit,
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
    variants.push({
      name: name as ImageVariantName,
      body: data,
      contentType: "image/webp",
      extension: "webp",
      width: info.width,
      height: info.height,
      bytes: data.byteLength,
    })
  }
  return variants
}
