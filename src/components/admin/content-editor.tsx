"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import type { AdminLocaleStates, AdminPublicationState } from "@/modules/admin/queries"

type Locale = "en" | "ar"

export function publicationStateFromPublishedAt(publishedAt: string | null): "DRAFT" | "PUBLISHED" {
  return publishedAt ? "PUBLISHED" : "DRAFT"
}

type AdminTranslation = {
  id: string
  locale: Locale
  title: string
  summary: string | null
  body: string
  seoTitle: string | null
  seoDescription: string | null
  publishedAt: string | null
  hasDraftChanges?: boolean
}

type AdminContentPage = {
  slug: string
  pageType: string
  publishedAt: string | null
  updatedAt: string
  localeStates: AdminLocaleStates
  translations: AdminTranslation[]
  marketPage: { marketCode: string; sourceTag: string | null } | null
}

type ContentEditorProps = {
  page: AdminContentPage
}

type TranslationFormState = {
  title: string
  summary: string
  body: string
  seoTitle: string
  seoDescription: string
}

const errorMessages: Record<string, string> = {
  ENGLISH_PUBLICATION_REQUIRED: "Publish English before Arabic.",
  TRANSLATION_NOT_FOUND: "Save this locale before publishing it.",
  CONTENT_NOT_FOUND: "This content page no longer exists.",
}

function emptyTranslation(): TranslationFormState {
  return { title: "", summary: "", body: "", seoTitle: "", seoDescription: "" }
}

function formFromTranslation(translation: AdminTranslation | undefined): TranslationFormState {
  return translation
    ? {
        title: translation.title,
        summary: translation.summary ?? "",
        body: translation.body,
        seoTitle: translation.seoTitle ?? "",
        seoDescription: translation.seoDescription ?? "",
      }
    : emptyTranslation()
}

function stateLabel(state: AdminPublicationState, hasDraftChanges = false) {
  if (state === "PUBLISHED" && hasDraftChanges) {
    return "Published · changes waiting"
  }
  return state === "PUBLISHED" ? "Published" : state === "DRAFT" ? "Draft" : "Missing"
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
}: {
  label: string
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  multiline?: boolean
  required?: boolean
}) {
  return (
    <label className="admin-field">
      <span>{label}{required ? " *" : ""}</span>
      {multiline ? <textarea value={value} onChange={onChange} required={required} rows={multiline ? 8 : 3} /> : <input value={value} onChange={onChange} required={required} />}
    </label>
  )
}

async function postContentMutation(slug: string, body: unknown) {
  const response = await fetch(`/api/admin/content/${slug.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const result = await response.json() as { ok: boolean; code?: string; translation?: AdminTranslation }
  if (!response.ok || !result.ok) {
    throw new Error(result.code ?? "CONTENT_MUTATION_UNAVAILABLE")
  }
  return result
}

export function ContentEditor({ page: initialPage }: ContentEditorProps) {
  const router = useRouter()
  const [page, setPage] = useState(initialPage)
  const [locale, setLocale] = useState<Locale>("en")
  const [forms, setForms] = useState<Record<Locale, TranslationFormState>>(() => ({
    en: formFromTranslation(initialPage.translations.find(({ locale: itemLocale }) => itemLocale === "en")),
    ar: formFromTranslation(initialPage.translations.find(({ locale: itemLocale }) => itemLocale === "ar")),
  }))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const currentForm = forms[locale]

  function updateField(field: keyof TranslationFormState, value: string) {
    setForms((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
  }

  async function mutate(
    action: "save_translation" | "publish_locale" | "unpublish_locale",
    targetLocale: Locale = locale,
  ) {
    const targetForm = forms[targetLocale]
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const result = await postContentMutation(page.slug, {
        action,
        locale: targetLocale,
        ...(action === "save_translation" ? {
          translation: {
            title: targetForm.title,
            summary: targetForm.summary || null,
            body: targetForm.body,
            seoTitle: targetForm.seoTitle || null,
            seoDescription: targetForm.seoDescription || null,
          },
        } : {}),
      })
      if (action === "save_translation" && result.translation) {
        setPage((current) => ({
          ...current,
          translations: [...current.translations.filter((item) => item.locale !== targetLocale), result.translation as AdminTranslation],
          localeStates: {
            ...current.localeStates,
            [targetLocale]: publicationStateFromPublishedAt((result.translation as AdminTranslation).publishedAt),
          },
        }))
      } else if (action === "publish_locale") {
        setPage((current) => ({
          ...current,
          translations: result.translation
            ? current.translations.map((item) => item.locale === targetLocale
              ? { ...item, ...(result.translation as AdminTranslation), hasDraftChanges: false }
              : item)
            : current.translations,
          localeStates: { ...current.localeStates, [targetLocale]: "PUBLISHED" },
        }))
      } else if (action === "unpublish_locale") {
        setPage((current) => ({
          ...current,
          localeStates: targetLocale === "en" ? { en: "DRAFT", ar: "DRAFT" } : { ...current.localeStates, ar: "DRAFT" },
        }))
      }
      setNotice(action === "save_translation" ? `${targetLocale.toUpperCase()} draft saved.` : action === "publish_locale" ? `${targetLocale.toUpperCase()} is now public.` : `${targetLocale.toUpperCase()} was removed from public view.`)
      router.refresh()
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : ""
      setError(errorMessages[code] ?? "The content action could not be completed.")
    } finally {
      setBusy(false)
    }
  }

  function switchLocale(nextLocale: Locale) {
    setLocale(nextLocale)
    setError("")
    setNotice("")
  }

  return (
    <div className="admin-editor">
      {error ? <p className="admin-alert" role="alert">{error}</p> : null}
      {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
      <section className="admin-panel admin-content-panel" aria-labelledby="content-editor-title">
        <div className="admin-panel__heading">
          <div>
            <p className="eyebrow">Content studio / {page.pageType}</p>
            <h2 id="content-editor-title">Keep the trust narrative current.</h2>
          </div>
          <div className="admin-locale-tabs" role="tablist" aria-label="Content locale">
            {(["en", "ar"] as Locale[]).map((candidate) => (
              <button className={locale === candidate ? "is-active" : ""} key={candidate} onClick={() => switchLocale(candidate)} role="tab" aria-selected={locale === candidate} type="button">
                {candidate === "en" ? "English" : "العربية"}
              </button>
            ))}
          </div>
        </div>
        <form className={`admin-translation-form${locale === "ar" ? " admin-translation-form--rtl" : ""}`} dir={locale === "ar" ? "rtl" : "ltr"} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void mutate("save_translation") }}>
          <Field label="Title" value={currentForm.title} onChange={(event) => updateField("title", event.target.value)} required />
          <Field label="SEO title" value={currentForm.seoTitle} onChange={(event) => updateField("seoTitle", event.target.value)} />
          <Field label="Summary" value={currentForm.summary} onChange={(event) => updateField("summary", event.target.value)} />
          <Field label="SEO description" value={currentForm.seoDescription} onChange={(event) => updateField("seoDescription", event.target.value)} />
          <Field label="Body" value={currentForm.body} onChange={(event) => updateField("body", event.target.value)} multiline required />
          <div className="admin-panel__actions">
            <button className="button button--primary" disabled={busy} type="submit">{busy ? "Saving…" : `Save ${locale.toUpperCase()} draft`}</button>
            <span>Drafts are private and do not change public visibility.</span>
          </div>
        </form>
        <div className="admin-publication-strip">
          {(["en", "ar"] as Locale[]).map((candidate) => {
            const candidateState = page.localeStates[candidate]
            const candidateTranslation = page.translations.find((item) => item.locale === candidate)
            return (
              <div key={candidate}>
                <span>{candidate === "en" ? "English" : "Arabic"}</span>
                <strong data-state={candidateState === "PUBLISHED" ? "published" : "draft"}>{stateLabel(candidateState, candidateTranslation?.hasDraftChanges)}</strong>
                {candidateState === "PUBLISHED" && candidateTranslation?.hasDraftChanges ? <>
                  <button disabled={busy} onClick={() => { switchLocale(candidate); void mutate("publish_locale", candidate) }} type="button">Publish changes</button>
                  <button disabled={busy} onClick={() => { switchLocale(candidate); void mutate("unpublish_locale", candidate) }} type="button">Unpublish</button>
                </> : <button disabled={busy || !candidateTranslation} onClick={() => { switchLocale(candidate); void mutate(candidateState === "PUBLISHED" ? "unpublish_locale" : "publish_locale", candidate) }} type="button">
                  {candidateState === "PUBLISHED" ? "Unpublish" : "Publish"}
                </button>}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
