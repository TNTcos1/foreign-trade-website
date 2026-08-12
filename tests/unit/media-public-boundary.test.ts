// @vitest-environment node

import { describe, expect, it } from "vitest"

import { getPublicMediaUrl } from "@/lib/site-url"
import { projectPublicMediaMetadata } from "@/modules/media/metadata"

const environment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  NEXT_PUBLIC_SITE_URL: "https://catalog.example.test",
  STORAGE_PUBLIC_URL: "https://media.example.test/assets/",
}

describe("public media boundary", () => {
  it("allows only the site and configured storage origins", () => {
    expect(getPublicMediaUrl("/seed-media/proof.jpg", environment)).toBe(
      "https://catalog.example.test/seed-media/proof.jpg",
    )
    expect(getPublicMediaUrl(
      "https://media.example.test/assets/proof.webp",
      environment,
    )).toBe("https://media.example.test/assets/proof.webp")
    expect(getPublicMediaUrl(
      "https://media.example.test/assets/nested/proof.webp",
      environment,
    )).toBe("https://media.example.test/assets/nested/proof.webp")
    expect(getPublicMediaUrl(
      "https://media.example.test/private/proof.webp",
      environment,
    )).toBeNull()
    expect(getPublicMediaUrl("https://untrusted.example/proof.jpg", environment)).toBeNull()
    expect(getPublicMediaUrl("javascript:alert(1)", environment)).toBeNull()
    expect(getPublicMediaUrl("https://user:secret@media.example.test/proof.jpg", environment)).toBeNull()
  })

  it("projects only safe dimensions and controlled variant URLs", () => {
    const projected = projectPublicMediaMetadata({
      version: 1,
      original: {
        key: "staging/media/private",
        checksumSha256: "secret-checksum",
        width: 1600,
        height: 1067,
        bytes: 1234,
      },
      variants: {
        primary: {
          key: "internal-key",
          url: "https://media.example.test/assets/primary.webp",
          width: 1600,
          height: 1067,
          bytes: 500,
        },
        card: {
          url: "https://untrusted.example/card.webp",
          width: 720,
          height: 900,
        },
      },
      unknown: "private-value",
    }, environment)

    expect(projected).toEqual({
      width: 1600,
      height: 1067,
      variants: {
        primary: {
          url: "https://media.example.test/assets/primary.webp",
          width: 1600,
          height: 1067,
        },
      },
    })
    expect(JSON.stringify(projected)).not.toMatch(/key|checksum|bytes|private/i)
  })

  it("keeps legacy seed metadata to dimensions only", () => {
    expect(projectPublicMediaMetadata({
      developmentOnly: true,
      source: "seed-placeholder",
      width: 1600,
      height: 1067,
    }, environment)).toEqual({ width: 1600, height: 1067 })
  })
})
