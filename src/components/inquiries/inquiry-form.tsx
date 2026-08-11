"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"

import { useInquiryList } from "@/components/inquiries/inquiry-list-provider"
import { InquiryListSummary } from "@/components/inquiries/inquiry-list-summary"
import { trackPublicEvent } from "@/modules/analytics/events"
import type { InquiryListItem } from "@/modules/inquiries/storage"
import {
  validateInquiryForm,
  type InquiryField,
  type InquiryValidationCode,
} from "@/modules/inquiries/validation"
import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

type ApiError = {
  ok: false
  code: string
  fieldErrors?: Partial<Record<InquiryField, InquiryValidationCode[]>>
  itemErrors?: Array<{ productId?: string; code: string }>
}

type ApiSuccess = {
  ok: true
  inquiryNumber: string
  redirectUrl: string
  duplicate: boolean
}

function errorCopy(code: InquiryValidationCode, locale: SupportedLocale): string {
  const copy = getDictionary(locale).inquiry.errors
  if (code === "REQUIRED") return copy.required
  if (code === "TOO_LONG") return copy.tooLong
  if (code === "INVALID_COUNTRY") return copy.invalidCountry
  if (code === "INVALID_WHATSAPP") return copy.invalidWhatsapp
  if (code === "INVALID_QUANTITY") return copy.invalidQuantity
  if (code === "TOO_MANY_ITEMS") return copy.tooManyItems
  if (code === "DUPLICATE_ITEM") return copy.duplicateItem
  if (code === "REQUIREMENT_OR_ITEM_REQUIRED") return copy.requirementOrItem
  return copy.invalidForm
}

export function InquiryForm({
  locale,
  antiBotToken,
  initialItem,
}: {
  locale: SupportedLocale
  antiBotToken: string
  initialItem: InquiryListItem | null
}) {
  const router = useRouter()
  const { items, source, hydrated, addItem, clear } = useInquiryList()
  const dictionary = getDictionary(locale)
  const copy = dictionary.inquiry.form
  const openedEventSent = useRef(false)
  const initializedProductId = useRef<string | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<InquiryField, InquiryValidationCode[]>>>({})
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID())
  }, [])

  useEffect(() => {
    if (!hydrated || openedEventSent.current) {
      return
    }
    openedEventSent.current = true
    trackPublicEvent({
      name: "inquiry_opened",
      locale,
      itemCount: items.length,
      placement: "inquiry_page",
      channel: source?.channel,
    })
  }, [hydrated, items.length, locale, source?.channel])

  useEffect(() => {
    if (
      !hydrated ||
      !initialItem ||
      initializedProductId.current === initialItem.productId
    ) {
      return
    }
    initializedProductId.current = initialItem.productId
    addItem(initialItem, "inquiry_page", null, false)
    const url = new URL(window.location.href)
    url.searchParams.delete("product")
    router.replace(`${url.pathname}${url.search}`)
  }, [addItem, hydrated, initialItem, router])

  const itemPayload = useMemo(() => items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    note: item.note,
  })), [items])

  function firstError(field: InquiryField): string | undefined {
    const code = fieldErrors[field]?.[0]
    return code ? errorCopy(code, locale) : undefined
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!source || !idempotencyKey) {
      setSubmissionError(copy.genericError)
      return
    }

    const data = new FormData(event.currentTarget)
    const payload = {
      locale,
      name: data.get("name"),
      country: data.get("country"),
      whatsapp: data.get("whatsapp"),
      company: data.get("company"),
      requirement: data.get("requirement"),
      items: itemPayload,
      source,
      idempotencyKey,
      antiBotToken,
      website: data.get("website"),
    }
    const validation = validateInquiryForm(payload)
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors)
      setSubmissionError(null)
      return
    }

    setSubmitting(true)
    setFieldErrors({})
    setSubmissionError(null)
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json() as ApiError | ApiSuccess
      if (!response.ok || !result.ok) {
        const failure = result as ApiError
        setFieldErrors(failure.fieldErrors ?? {})
        if (failure.code === "PRODUCT_UNAVAILABLE") {
          setSubmissionError(copy.unavailableItems)
        } else if (failure.code === "RATE_LIMITED") {
          setSubmissionError(copy.rateLimited)
        } else {
          setSubmissionError(copy.genericError)
        }
        return
      }

      clear()
      trackPublicEvent({
        name: "inquiry_submitted",
        locale,
        itemCount: items.length,
        placement: "inquiry_page",
        channel: source.channel,
        campaign: source.campaign ?? undefined,
      })
      router.push(result.redirectUrl)
    } catch {
      setSubmissionError(copy.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="inquiry-form" noValidate onSubmit={handleSubmit}>
      {submissionError ? (
        <div className="inquiry-form__alert" role="alert">{submissionError}</div>
      ) : null}

      <div className="inquiry-form__contact">
        <label>
          <span>{copy.name}</span>
          <input name="name" type="text" autoComplete="name" maxLength={120} aria-invalid={Boolean(firstError("name"))} aria-describedby="name-error" />
          {firstError("name") ? <small id="name-error" className="field-error">{firstError("name")}</small> : null}
        </label>
        <label>
          <span>{copy.country}</span>
          <input name="country" type="text" autoComplete="country" maxLength={2} dir="ltr" aria-invalid={Boolean(firstError("country"))} aria-describedby="country-hint country-error" />
          <small id="country-hint">{copy.countryHint}</small>
          {firstError("country") ? <small id="country-error" className="field-error">{firstError("country")}</small> : null}
        </label>
        <label>
          <span>{copy.whatsapp}</span>
          <input name="whatsapp" type="tel" autoComplete="tel" maxLength={24} dir="ltr" aria-invalid={Boolean(firstError("whatsapp"))} aria-describedby="whatsapp-error" />
          {firstError("whatsapp") ? <small id="whatsapp-error" className="field-error">{firstError("whatsapp")}</small> : null}
        </label>
        <label>
          <span>{copy.company}</span>
          <input name="company" type="text" autoComplete="organization" maxLength={120} aria-invalid={Boolean(firstError("company"))} aria-describedby="company-error" />
          {firstError("company") ? <small id="company-error" className="field-error">{firstError("company")}</small> : null}
        </label>
      </div>

      <label className="inquiry-form__requirement">
        <span>{copy.requirement}</span>
        <textarea name="requirement" rows={6} maxLength={2_000} placeholder={copy.requirementPlaceholder} aria-invalid={Boolean(firstError("requirement") || firstError("items"))} aria-describedby="requirement-error" />
        {firstError("requirement") || firstError("items") ? (
          <small id="requirement-error" className="field-error">{firstError("requirement") ?? firstError("items")}</small>
        ) : null}
      </label>

      <section className="inquiry-form__items" aria-labelledby="inquiry-form-items-title">
        <h2 id="inquiry-form-items-title">{copy.selectedItems}</h2>
        <InquiryListSummary locale={locale} />
      </section>

      <label className="inquiry-form__honeypot" aria-hidden="true">
        Website
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <p className="inquiry-form__privacy">
        {copy.privacyBefore} <Link href={`/${locale}/privacy`}>{copy.privacyLink}</Link>{copy.privacyAfter}
      </p>
      <button className="button button--primary inquiry-form__submit" type="submit" disabled={submitting || !hydrated}>
        {submitting ? copy.submitting : copy.submit}
      </button>
    </form>
  )
}
