import { describe, expect, it } from "vitest"
import { getDevelopmentSeedPassword } from "../../prisma/development-seed-policy"

describe("development seed policy", () => {
  it("requires explicit authorization and a password", () => {
    expect(() => getDevelopmentSeedPassword({})).toThrow("ALLOW_DEVELOPMENT_SEED=true")
    expect(() => getDevelopmentSeedPassword({ ALLOW_DEVELOPMENT_SEED: "true" })).toThrow(
      "DEVELOPMENT_SEED_PASSWORD",
    )
  })

  it("rejects production even when explicitly authorized", () => {
    expect(() =>
      getDevelopmentSeedPassword({
        NODE_ENV: "production",
        ALLOW_DEVELOPMENT_SEED: "true",
        DEVELOPMENT_SEED_PASSWORD: "not-used",
      }),
    ).toThrow("disabled in production")
  })

  it("returns the supplied password outside production", () => {
    expect(
      getDevelopmentSeedPassword({
        NODE_ENV: "development",
        ALLOW_DEVELOPMENT_SEED: "true",
        DEVELOPMENT_SEED_PASSWORD: "local-only-password",
      }),
    ).toBe("local-only-password")
  })
})
