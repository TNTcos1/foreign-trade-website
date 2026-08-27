import { type NextRequest, NextResponse } from "next/server"

import {
  adminJsonError,
  authorizeAdminRequest,
  readAdminJson,
} from "@/modules/auth/request"
import {
  createConfiguredTranslationProvider,
  TranslationProviderUnavailableError,
} from "@/modules/translation/provider"
import { translateEnglishToArabic } from "@/modules/translation/service"

const MAX_TEXT_LENGTH = 6_000
const MAX_PROTECTED_TERMS = 50
const MAX_PROTECTED_TERM_LENGTH = 180

type TranslationInput = {
  text: string
  protectedTerms?: string[]
}

function parseTranslationInput(value: unknown): TranslationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.text !== "string" ||
    !candidate.text.trim() ||
    candidate.text.length > MAX_TEXT_LENGTH
  ) {
    return null
  }
  if (candidate.protectedTerms === undefined) {
    return { text: candidate.text }
  }
  if (
    !Array.isArray(candidate.protectedTerms) ||
    candidate.protectedTerms.length > MAX_PROTECTED_TERMS ||
    candidate.protectedTerms.some((term) =>
      typeof term !== "string" ||
      !term.trim() ||
      term.length > MAX_PROTECTED_TERM_LENGTH
    )
  ) {
    return null
  }
  return {
    text: candidate.text,
    protectedTerms: candidate.protectedTerms as string[],
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(
    request,
    "translations:manage",
  )
  if (!authorization.success) {
    return authorization.response
  }

  const parsed = await readAdminJson(request)
  if (!parsed.success) {
    return parsed.response
  }
  const input = parseTranslationInput(parsed.body)
  if (!input) {
    return adminJsonError("INVALID_TRANSLATION_INPUT", 400)
  }

  try {
    const result = await translateEnglishToArabic({
      ...input,
      provider: createConfiguredTranslationProvider(),
    })
    if (!result.success) {
      const status = result.code === "PROVIDER_ERROR" ? 503 : 422
      return adminJsonError(result.code, status)
    }
    return NextResponse.json({
      ok: true,
      draft: {
        text: result.text,
        provider: result.provider,
      },
    })
  } catch (error) {
    if (error instanceof TranslationProviderUnavailableError) {
      return adminJsonError("TRANSLATION_PROVIDER_UNAVAILABLE", 503)
    }
    return adminJsonError("TRANSLATION_UNAVAILABLE", 503)
  }
}
