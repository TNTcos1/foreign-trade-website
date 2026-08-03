type DevelopmentSeedEnvironment = {
  NODE_ENV?: string
  ALLOW_DEVELOPMENT_SEED?: string
  DEVELOPMENT_SEED_PASSWORD?: string
}

export function getDevelopmentSeedPassword(environment: DevelopmentSeedEnvironment): string {
  if (environment.NODE_ENV === "production") {
    throw new Error("Development seed is disabled in production.")
  }

  if (environment.ALLOW_DEVELOPMENT_SEED !== "true") {
    throw new Error("Set ALLOW_DEVELOPMENT_SEED=true to run the development seed.")
  }

  const password = environment.DEVELOPMENT_SEED_PASSWORD

  if (!password) {
    throw new Error("Set DEVELOPMENT_SEED_PASSWORD to run the development seed.")
  }

  return password
}
