export type TranslationProviderInput = {
  text: string
  sourceLocale: "en"
  targetLocale: "ar"
}

export interface TranslationProvider {
  readonly name: string
  translate(input: TranslationProviderInput): Promise<string>
}

export class TranslationProviderUnavailableError extends Error {
  constructor() {
    super("Translation provider is not configured")
    this.name = "TranslationProviderUnavailableError"
  }
}

export class DeterministicFakeTranslationProvider
implements TranslationProvider {
  readonly name = "fake"

  constructor(private readonly prefix = "مسودة ") {}

  async translate(input: TranslationProviderInput): Promise<string> {
    return `${this.prefix}${input.text}`
  }
}

export function createConfiguredTranslationProvider(
  environment: NodeJS.ProcessEnv = process.env,
): TranslationProvider {
  const provider = environment.TRANSLATION_PROVIDER?.trim().toLowerCase()
  if (
    provider === "fake" &&
    environment.NODE_ENV !== "production"
  ) {
    return new DeterministicFakeTranslationProvider()
  }
  throw new TranslationProviderUnavailableError()
}
