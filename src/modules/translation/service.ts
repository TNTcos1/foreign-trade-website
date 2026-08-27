import {
  TranslationIntegrityError,
  protectTerms,
  restoreTerms,
} from "@/modules/translation/term-protection"
import type { TranslationProvider } from "@/modules/translation/provider"

export type ArabicDraft = {
  text: string
  provider: string
}

export type TranslationResult =
  | ({ success: true } & ArabicDraft)
  | {
      success: false
      code: "PROVIDER_ERROR" | "EMPTY_TRANSLATION" | "TOKEN_INTEGRITY_ERROR" | "PERSISTENCE_ERROR"
      englishDraft: string
    }

export async function translateEnglishToArabic(input: {
  text: string
  protectedTerms?: readonly string[]
  provider: TranslationProvider
  saveDraft?: (draft: ArabicDraft) => Promise<void> | void
}): Promise<TranslationResult> {
  let protectedInput: ReturnType<typeof protectTerms>
  try {
    protectedInput = protectTerms(input.text, input.protectedTerms)
  } catch (error) {
    if (error instanceof TranslationIntegrityError) {
      return {
        success: false,
        code: "TOKEN_INTEGRITY_ERROR",
        englishDraft: input.text,
      }
    }
    throw error
  }
  let translated: string
  try {
    translated = await input.provider.translate({
      text: protectedInput.maskedText,
      sourceLocale: "en",
      targetLocale: "ar",
    })
  } catch {
    return {
      success: false,
      code: "PROVIDER_ERROR",
      englishDraft: input.text,
    }
  }

  if (!translated.trim()) {
    return {
      success: false,
      code: "EMPTY_TRANSLATION",
      englishDraft: input.text,
    }
  }

  let restored: string
  try {
    restored = restoreTerms(translated, protectedInput)
  } catch (error) {
    if (error instanceof TranslationIntegrityError) {
      return {
        success: false,
        code: "TOKEN_INTEGRITY_ERROR",
        englishDraft: input.text,
      }
    }
    throw error
  }

  const draft = { text: restored, provider: input.provider.name }
  try {
    await input.saveDraft?.(draft)
  } catch {
    return {
      success: false,
      code: "PERSISTENCE_ERROR",
      englishDraft: input.text,
    }
  }
  return { success: true, ...draft }
}
