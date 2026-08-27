import { randomBytes } from "node:crypto"

export type ProtectedToken = {
  placeholder: string
  value: string
}

export type ProtectedTranslationInput = {
  maskedText: string
  markerPrefix: string
  tokens: readonly ProtectedToken[]
}

export class TranslationIntegrityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TranslationIntegrityError"
  }
}

const commercialPatterns = [
  /\b(?=[A-Z0-9-]{5,}\b)(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)+\b/giu,
  /\bMOQ\s+\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:pcs?|pieces?|units?|packs?|cartons?|boxes?|containers?))?/giu,
  /\b(?:USD|EUR|CNY|RMB)\s*\d+(?:,\d{3})*(?:\.\d+)?(?:\s*[–—-]\s*(?:(?:USD|EUR|CNY|RMB)\s*)?\d+(?:,\d{3})*(?:\.\d+)?)?/giu,
  /\b\d+(?:[.,]\d+)?\s*[×x]\s*\d+(?:[.,]\d+)?(?:\s*[×x]\s*\d+(?:[.,]\d+)?)?\s*(?:mm|cm|m|kg|g)\b/giu,
  /\b\d+(?:,\d{3})*(?:\.\d+)?\s*[–—-]\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(?:days?|weeks?|months?)\b/giu,
  /\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:pcs?|pieces?|units?|packs?|cartons?|boxes?|containers?|kg|g|mm|cm|m|days?|weeks?|months?)\b/giu,
  /\b\d+(?:,\d{3})*(?:\.\d+)?(?:\s*[–—-]\s*\d+(?:,\d{3})*(?:\.\d+)?)?\b/gu,
] as const

function occurrences(text: string, value: string): number {
  let count = 0
  let offset = 0
  while (true) {
    const index = text.indexOf(value, offset)
    if (index === -1) {
      return count
    }
    count += 1
    offset = index + value.length
  }
}

const fieldHints = new Set([
  "currencies",
  "dimensions",
  "leadtime",
  "moq",
  "numbers",
  "price",
  "productcode",
  "units",
])

function collectProtectedRanges(text: string, fields: readonly string[]) {
  const ranges: Array<{ start: number; end: number; value: string }> = []

  for (const rawTerm of fields) {
    const term = rawTerm.trim()
    if (!term || fieldHints.has(term.toLowerCase())) {
      continue
    }
    if (!text.includes(term)) {
      throw new TranslationIntegrityError(`Protected term is missing: ${rawTerm}`)
    }
    let offset = 0
    while (true) {
      const start = text.indexOf(term, offset)
      if (start === -1) {
        break
      }
      ranges.push({ start, end: start + term.length, value: term })
      offset = start + term.length
    }
  }

  for (const pattern of commercialPatterns) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      if (match.index === undefined || !match[0]) {
        continue
      }
      ranges.push({
        start: match.index,
        end: match.index + match[0].length,
        value: match[0],
      })
    }
  }

  ranges.sort((left, right) => {
    const lengthDifference = right.end - right.start - (left.end - left.start)
    return left.start - right.start || lengthDifference
  })

  const selected: typeof ranges = []
  for (const range of ranges) {
    if (selected.some((existing) => range.start < existing.end && range.end > existing.start)) {
      continue
    }
    selected.push(range)
  }
  return selected.sort((left, right) => left.start - right.start)
}

export function protectTerms(
  text: string,
  explicitTerms: readonly string[] = [],
): ProtectedTranslationInput {
  const markerPrefix = `__HS_${randomBytes(6).toString("hex").toUpperCase()}_`
  if (text.includes(markerPrefix)) {
    throw new TranslationIntegrityError("Placeholder marker conflicts with source text")
  }

  const ranges = collectProtectedRanges(text, explicitTerms)
  const tokens: ProtectedToken[] = []
  let maskedText = ""
  let offset = 0

  for (const [index, range] of ranges.entries()) {
    const placeholder = `${markerPrefix}${index}__`
    tokens.push({ placeholder, value: range.value })
    maskedText += text.slice(offset, range.start) + placeholder
    offset = range.end
  }
  maskedText += text.slice(offset)

  return { maskedText, markerPrefix, tokens }
}

export function restoreTerms(
  translated: string,
  protectedInput: ProtectedTranslationInput,
): string {
  const markerPattern = new RegExp(
    `${protectedInput.markerPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d+__`,
    "g",
  )
  const foundMarkers = translated.match(markerPattern) ?? []
  if (foundMarkers.length !== protectedInput.tokens.length) {
    throw new TranslationIntegrityError("Protected token count changed")
  }

  let restored = translated
  for (const token of protectedInput.tokens) {
    if (occurrences(restored, token.placeholder) !== 1) {
      throw new TranslationIntegrityError("Protected token is missing or duplicated")
    }
    restored = restored.replace(token.placeholder, token.value)
  }

  if (restored.includes(protectedInput.markerPrefix)) {
    throw new TranslationIntegrityError("Unknown protected token found")
  }
  return restored
}
