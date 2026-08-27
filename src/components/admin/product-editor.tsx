"use client"

import { useRouter } from "next/navigation"
import { useState, type ChangeEvent, type FormEvent } from "react"

import type { AdminLocaleStates } from "@/modules/admin/queries"

const errorMessages: Record<string, string> = {
  PRODUCT_CODE_EXISTS: "That product code is already in use.",
  PRODUCT_NOT_READY: "Set a publishable product status before publishing.",
  TRANSLATION_NOT_FOUND: "Save this locale before publishing it.",
  ENGLISH_PUBLICATION_REQUIRED: "English must be published before Arabic can be published.",
  TRANSLATION_PROVIDER_UNAVAILABLE: "The translation provider is not configured.",
  TRANSLATION_UNAVAILABLE: "The translation service is unavailable.",
  MEDIA_STORAGE_UNAVAILABLE: "Media storage is not configured for this environment.",
  MEDIA_UPLOAD_UNAVAILABLE: "The media upload could not be prepared.",
  MEDIA_COMPLETION_UNAVAILABLE: "The uploaded image could not be verified.",
}

type Locale = "en" | "ar"

type PublicationState = "DRAFT" | "PUBLISHED"

export function publicationStateFromPublishedAt(publishedAt: string | null): PublicationState {
  return publishedAt ? "PUBLISHED" : "DRAFT"
}

type AdminTranslation = {
  id?: string
  locale: Locale
  title: string
  summary: string
  description: string
  seoTitle: string | null
  seoDescription: string | null
  shareImageAlt: string | null
  publishedAt: string | null
  hasDraftChanges?: boolean
}

type AdminMedia = {
  id: string
  mediaType: string
  url: string
  altText: string | null
  sortOrder: number
  isPrimary: boolean
}

type AdminProduct = {
  id: string
  code: string
  type: "STOCK_LOT" | "SINGLE_STYLE"
  status: "DRAFT" | "READY_STOCK" | "FACTORY_BOOKING" | "SOLD_OUT" | "ARCHIVED"
  category: string
  genderAge: string | null
  season: string | null
  tags: string[]
  sourceType: string | null
  sourceLocation: string | null
  qualityGrade: string | null
  clearanceReason: string | null
  defectNotes: string | null
  inspectionAvailable: boolean
  purchaseUnit: string
  minimumOrderQuantity: number | null
  tradeTerms: string | null
  currency: string
  referencePriceMin: string | null
  referencePriceMax: string | null
  priceBasis: string | null
  availableQuantity: number | null
  hasDraftChanges?: boolean
  localeStates: AdminLocaleStates
  translations: AdminTranslation[]
  media: AdminMedia[]
  stockLotDetails: {
    totalPieces: number
    totalPackages: number | null
    totalWeightKg: string | null
    totalVolumeCbm: string | null
    sizeRange: string | null
    piecesPerPackage: number | null
  } | null
  singleStyleDetails: {
    styleNumber: string
    fabric: string | null
    styleNotes: string | null
    piecesPerCarton: number | null
    factoryLeadTimeDays: number | null
  } | null
}

type ProductFormState = {
  code: string
  type: AdminProduct["type"]
  status: "DRAFT" | "READY_STOCK" | "FACTORY_BOOKING"
  category: string
  genderAge: string
  season: string
  tags: string
  sourceType: string
  sourceLocation: string
  qualityGrade: string
  clearanceReason: string
  defectNotes: string
  inspectionAvailable: boolean
  purchaseUnit: string
  minimumOrderQuantity: string
  tradeTerms: string
  currency: string
  referencePriceMin: string
  referencePriceMax: string
  priceBasis: string
  availableQuantity: string
  totalPieces: string
  totalPackages: string
  totalWeightKg: string
  totalVolumeCbm: string
  sizeRange: string
  piecesPerPackage: string
  styleNumber: string
  fabric: string
  styleNotes: string
  piecesPerCarton: string
  factoryLeadTimeDays: string
}

type TranslationFormState = {
  title: string
  summary: string
  description: string
  seoTitle: string
  seoDescription: string
  shareImageAlt: string
}

type ProductEditorProps = {
  mode: "create" | "edit"
  initialProduct?: AdminProduct
}

function nullable(value: string): string | null {
  const normalized = value.trim()
  return normalized || null
}

function optionalInteger(value: string): number | null {
  const normalized = value.trim()
  return normalized ? Number(normalized) : null
}

function translationState(product: AdminProduct | undefined, locale: Locale): TranslationFormState {
  const translation = product?.translations.find((item) => item.locale === locale)
  return {
    title: translation?.title ?? "",
    summary: translation?.summary ?? "",
    description: translation?.description ?? "",
    seoTitle: translation?.seoTitle ?? "",
    seoDescription: translation?.seoDescription ?? "",
    shareImageAlt: translation?.shareImageAlt ?? "",
  }
}

function initialForm(product: AdminProduct | undefined): ProductFormState {
  return {
    code: product?.code ?? "",
    type: product?.type ?? "STOCK_LOT",
    status: product?.status === "READY_STOCK" || product?.status === "FACTORY_BOOKING" ? product.status : "DRAFT",
    category: product?.category ?? "",
    genderAge: product?.genderAge ?? "",
    season: product?.season ?? "",
    tags: product?.tags.join(", ") ?? "",
    sourceType: product?.sourceType ?? "",
    sourceLocation: product?.sourceLocation ?? "",
    qualityGrade: product?.qualityGrade ?? "",
    clearanceReason: product?.clearanceReason ?? "",
    defectNotes: product?.defectNotes ?? "",
    inspectionAvailable: product?.inspectionAvailable ?? false,
    purchaseUnit: product?.purchaseUnit ?? "pieces",
    minimumOrderQuantity: product?.minimumOrderQuantity?.toString() ?? "",
    tradeTerms: product?.tradeTerms ?? "",
    currency: product?.currency ?? "USD",
    referencePriceMin: product?.referencePriceMin ?? "",
    referencePriceMax: product?.referencePriceMax ?? "",
    priceBasis: product?.priceBasis ?? "",
    availableQuantity: product?.availableQuantity?.toString() ?? "",
    totalPieces: product?.stockLotDetails?.totalPieces.toString() ?? "",
    totalPackages: product?.stockLotDetails?.totalPackages?.toString() ?? "",
    totalWeightKg: product?.stockLotDetails?.totalWeightKg ?? "",
    totalVolumeCbm: product?.stockLotDetails?.totalVolumeCbm ?? "",
    sizeRange: product?.stockLotDetails?.sizeRange ?? "",
    piecesPerPackage: product?.stockLotDetails?.piecesPerPackage?.toString() ?? "",
    styleNumber: product?.singleStyleDetails?.styleNumber ?? "",
    fabric: product?.singleStyleDetails?.fabric ?? "",
    styleNotes: product?.singleStyleDetails?.styleNotes ?? "",
    piecesPerCarton: product?.singleStyleDetails?.piecesPerCarton?.toString() ?? "",
    factoryLeadTimeDays: product?.singleStyleDetails?.factoryLeadTimeDays?.toString() ?? "",
  }
}

function errorMessage(code: string | undefined, fallback: string) {
  return errorMessages[code ?? ""] ?? fallback
}

function businessPayload(form: ProductFormState) {
  const tags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
  return {
    type: form.type,
    status: form.status,
    category: form.category,
    genderAge: nullable(form.genderAge),
    season: nullable(form.season),
    tags,
    sourceType: nullable(form.sourceType),
    sourceLocation: nullable(form.sourceLocation),
    qualityGrade: nullable(form.qualityGrade),
    clearanceReason: nullable(form.clearanceReason),
    defectNotes: nullable(form.defectNotes),
    inspectionAvailable: form.inspectionAvailable,
    purchaseUnit: form.purchaseUnit,
    minimumOrderQuantity: optionalInteger(form.minimumOrderQuantity),
    tradeTerms: nullable(form.tradeTerms),
    currency: form.currency,
    referencePriceMin: nullable(form.referencePriceMin),
    referencePriceMax: nullable(form.referencePriceMax),
    priceBasis: nullable(form.priceBasis),
    availableQuantity: optionalInteger(form.availableQuantity),
    stockLotDetails: form.type === "STOCK_LOT" ? {
      totalPieces: Number(form.totalPieces),
      totalPackages: optionalInteger(form.totalPackages),
      totalWeightKg: nullable(form.totalWeightKg),
      totalVolumeCbm: nullable(form.totalVolumeCbm),
      sizeRange: nullable(form.sizeRange),
      piecesPerPackage: optionalInteger(form.piecesPerPackage),
    } : null,
    singleStyleDetails: form.type === "SINGLE_STYLE" ? {
      styleNumber: form.styleNumber,
      fabric: nullable(form.fabric),
      styleNotes: nullable(form.styleNotes),
      piecesPerCarton: optionalInteger(form.piecesPerCarton),
      factoryLeadTimeDays: optionalInteger(form.factoryLeadTimeDays),
    } : null,
  }
}

function translationPayload(form: TranslationFormState) {
  return {
    title: form.title,
    summary: form.summary,
    description: form.description,
    seoTitle: nullable(form.seoTitle),
    seoDescription: nullable(form.seoDescription),
    shareImageAlt: nullable(form.shareImageAlt),
  }
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const result = await response.json() as { ok: boolean; code?: string; product?: AdminProduct; translation?: AdminTranslation; media?: AdminMedia }
  if (!response.ok || !result.ok) {
    throw new Error(result.code ?? "REQUEST_FAILED")
  }
  return result
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  dir,
}: {
  label: string
  name: string
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  type?: "text" | "number"
  required?: boolean
  dir?: "rtl" | "ltr"
}) {
  return (
    <label className="admin-field">
      <span>{label}{required ? " *" : ""}</span>
      {type === "text" && name.endsWith("description") ? (
        <textarea dir={dir} name={name} value={value} onChange={onChange} required={required} rows={6} />
      ) : (
        <input dir={dir} name={name} type={type} value={value} onChange={onChange} required={required} />
      )}
    </label>
  )
}

export function ProductEditor({ mode, initialProduct }: ProductEditorProps) {
  const router = useRouter()
  const [form, setForm] = useState(() => initialForm(initialProduct))
  const [locale, setLocale] = useState<Locale>("en")
  const [translations, setTranslations] = useState<Record<Locale, TranslationFormState>>(() => ({
    en: translationState(initialProduct, "en"),
    ar: translationState(initialProduct, "ar"),
  }))
  const [product, setProduct] = useState(initialProduct)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [translationBusy, setTranslationBusy] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)

  function updateForm(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const target = event.currentTarget
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value
    setForm((current) => ({ ...current, [target.name]: value }))
  }

  function updateTranslation(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = event.currentTarget
    setTranslations((current) => ({
      ...current,
      [locale]: { ...current[locale], [target.name]: target.value },
    }))
  }

  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setNotice("")
    try {
      if (mode === "create") {
        const result = await postJson("/api/admin/products", {
          ...businessPayload(form),
          code: form.code,
          translation: translationPayload(translations.en),
        })
        if (!result.product?.id) throw new Error("PRODUCT_SAVE_UNAVAILABLE")
        router.replace(`/admin/products/${result.product.id}`)
        router.refresh()
        return
      }
      const result = await postJson(`/api/admin/products/${product?.id}`, {
        action: "update",
        product: businessPayload(form),
      })
      setProduct((current) => current ? { ...current, ...result.product } : current)
      setNotice("Business facts saved. Publication states were not changed.")
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : undefined, "The product facts could not be saved."))
    } finally {
      setBusy(false)
    }
  }

  async function saveTranslation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!product) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const result = await postJson(`/api/admin/products/${product.id}`, {
        action: "save_translation",
        locale,
        translation: translationPayload(translations[locale]),
      })
      setProduct((current) => current ? {
        ...current,
        translations: [
          ...current.translations.filter((item) => item.locale !== locale),
          result.translation as AdminTranslation,
        ],
        localeStates: {
          ...current.localeStates,
          [locale]: publicationStateFromPublishedAt((result.translation as AdminTranslation).publishedAt),
        },
      } : current)
      setNotice(`${locale.toUpperCase()} translation saved as a draft.`)
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : undefined, "The translation could not be saved."))
    } finally {
      setBusy(false)
    }
  }

  async function changePublication(action: "publish_locale" | "unpublish_locale", targetLocale: Locale) {
    if (!product) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const result = await postJson(`/api/admin/products/${product.id}`, { action, locale: targetLocale })
      setProduct((current) => current ? {
        ...current,
        ...(action === "publish_locale" && targetLocale === "en" ? { hasDraftChanges: false } : {}),
        ...(action === "publish_locale" && result.translation ? {
          translations: current.translations.map((item) => item.locale === targetLocale
            ? { ...item, ...(result.translation as AdminTranslation), hasDraftChanges: false }
            : item),
        } : {}),
        localeStates: {
          ...current.localeStates,
          ...(targetLocale === "en" && action === "unpublish_locale" ? { en: "DRAFT", ar: "DRAFT" } : { [targetLocale]: action === "publish_locale" ? "PUBLISHED" : "DRAFT" }),
        },
      } : current)
      setNotice(action === "publish_locale" ? `${targetLocale.toUpperCase()} is now public.` : `${targetLocale.toUpperCase()} was removed from the public catalog.`)
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : undefined, "Publication could not be changed."))
    } finally {
      setBusy(false)
    }
  }

  async function productAction(action: "sold_out" | "archive" | "restore") {
    if (!product) return
    const confirmation = action === "restore"
      ? true
      : window.confirm(action === "archive" ? "Archive this record and remove all locales from public view?" : "Mark this record sold out?")
    if (!confirmation) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const result = await postJson(`/api/admin/products/${product.id}`, { action })
      setProduct((current) => current ? { ...current, ...result.product, localeStates: action === "archive" || action === "restore" ? { en: "DRAFT", ar: "DRAFT" } : current.localeStates } : current)
      setForm((current) => ({ ...current, status: action === "restore" ? "DRAFT" : action === "sold_out" ? current.status : "DRAFT" }))
      setNotice(action === "archive" ? "Record archived." : action === "restore" ? "Record restored as a private draft." : "Record marked sold out.")
      router.refresh()
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : undefined, "The product action could not be completed."))
    } finally {
      setBusy(false)
    }
  }

  async function duplicate() {
    if (!product) return
    const code = window.prompt("New product code", `${product.code}-COPY`)
    if (!code) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const result = await postJson(`/api/admin/products/${product.id}`, { action: "duplicate", code })
      if (!result.product?.id) throw new Error("PRODUCT_MUTATION_UNAVAILABLE")
      router.push(`/admin/products/${result.product.id}`)
      router.refresh()
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : undefined, "The product could not be duplicated."))
    } finally {
      setBusy(false)
    }
  }

  async function generateArabicDraft() {
    if (!product) return
    setTranslationBusy(true)
    setError("")
    setNotice("")
    try {
      const english = translations.en
      const protectedTerms = [product.code, form.currency, form.purchaseUnit, form.minimumOrderQuantity].filter(Boolean)
      const fields: Array<keyof Pick<TranslationFormState, "title" | "summary" | "description">> = ["title", "summary", "description"]
      const generated = await Promise.all(fields.map(async (field) => {
        const text = english[field]
        const result = await postJson("/api/admin/translation", {
          text,
          protectedTerms: protectedTerms.filter((term) => text.includes(term)),
        })
        return [field, (result as { draft?: { text: string } }).draft?.text ?? ""] as const
      }))
      setTranslations((current) => ({
        ...current,
        ar: { ...current.ar, ...Object.fromEntries(generated) },
      }))
      setLocale("ar")
      setNotice("Arabic text is ready for review. Save it as a draft before publishing.")
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : undefined, "Arabic draft generation failed."))
    } finally {
      setTranslationBusy(false)
    }
  }

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file || !product) return
    setUploadBusy(true)
    setError("")
    setNotice("")
    try {
      const declaration = { fileName: file.name, contentType: file.type, size: file.size }
      const presign = await postJson("/api/admin/media/presign", declaration)
      const upload = (presign as { upload?: { key: string; uploadUrl: string; fields: Record<string, string> } }).upload
      if (!upload) throw new Error("MEDIA_UPLOAD_UNAVAILABLE")
      const uploadBody = new FormData()
      Object.entries(upload.fields).forEach(([key, value]) => uploadBody.append(key, value))
      uploadBody.append("file", file)
      const uploaded = await fetch(upload.uploadUrl, { method: "POST", body: uploadBody })
      if (!uploaded.ok) throw new Error("MEDIA_UPLOAD_UNAVAILABLE")
      const result = await postJson("/api/admin/media/complete", {
        productId: product.id,
        key: upload.key,
        declaration,
        altText: file.name.replace(/\.[^.]+$/, ""),
        sortOrder: product.media.length,
        isPrimary: product.media.length === 0,
      })
      if (result.media) {
        setProduct((current) => current ? { ...current, media: [...current.media, result.media as AdminMedia] } : current)
      }
      setNotice("Image verified and attached to this product.")
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : undefined, "The image could not be attached."))
    } finally {
      setUploadBusy(false)
    }
  }

  const currentTranslation = translations[locale]
  const enPublished = product?.localeStates.en === "PUBLISHED"
  const arPublished = product?.localeStates.ar === "PUBLISHED"
  const enDraftChanges = Boolean(product?.hasDraftChanges) || Boolean(product?.translations.find(({ locale: candidate }) => candidate === "en")?.hasDraftChanges)
  const arDraftChanges = product?.translations.find(({ locale: candidate }) => candidate === "ar")?.hasDraftChanges ?? false
  const isArchived = product?.status === "ARCHIVED"

  return (
    <div className="admin-editor">
      {error ? <p className="admin-alert" role="alert">{error}</p> : null}
      {notice ? <p className="admin-notice" role="status">{notice}</p> : null}

      <form className="admin-panel admin-business-form" onSubmit={saveBusiness}>
        <div className="admin-panel__heading">
          <div>
            <p className="eyebrow">01 / stock facts</p>
            <h2>{mode === "create" ? "Open a new evidence record." : "Business fields stay private until published."}</h2>
          </div>
          <span>{mode === "create" ? "Draft intake" : product?.code}</span>
        </div>
        <div className="admin-form-grid">
          <Field label="Product code" name="code" value={form.code} onChange={updateForm} required={mode === "create"} />
          <label className="admin-field"><span>Inventory type *</span><select name="type" value={form.type} onChange={updateForm}><option value="STOCK_LOT">Stock lot</option><option value="SINGLE_STYLE">Single style</option></select></label>
          <label className="admin-field"><span>Internal status *</span><select name="status" value={form.status} onChange={updateForm}><option value="DRAFT">Draft</option><option value="READY_STOCK">Ready stock</option><option value="FACTORY_BOOKING">Factory booking</option></select></label>
          <Field label="Category" name="category" value={form.category} onChange={updateForm} required />
          <Field label="Gender / age" name="genderAge" value={form.genderAge} onChange={updateForm} />
          <Field label="Season" name="season" value={form.season} onChange={updateForm} />
          <Field label="Tags" name="tags" value={form.tags} onChange={updateForm} />
          <Field label="Purchase unit" name="purchaseUnit" value={form.purchaseUnit} onChange={updateForm} required />
          <Field label="Minimum order quantity" name="minimumOrderQuantity" type="number" value={form.minimumOrderQuantity} onChange={updateForm} />
          <Field label="Available quantity" name="availableQuantity" type="number" value={form.availableQuantity} onChange={updateForm} />
          <Field label="Currency" name="currency" value={form.currency} onChange={updateForm} required />
          <Field label="Reference price from" name="referencePriceMin" value={form.referencePriceMin} onChange={updateForm} />
          <Field label="Reference price to" name="referencePriceMax" value={form.referencePriceMax} onChange={updateForm} />
          <Field label="Price basis" name="priceBasis" value={form.priceBasis} onChange={updateForm} />
          <Field label="Trade terms" name="tradeTerms" value={form.tradeTerms} onChange={updateForm} />
          <Field label="Source type" name="sourceType" value={form.sourceType} onChange={updateForm} />
          <Field label="Source location" name="sourceLocation" value={form.sourceLocation} onChange={updateForm} />
          <Field label="Quality grade" name="qualityGrade" value={form.qualityGrade} onChange={updateForm} />
          <Field label="Clearance reason" name="clearanceReason" value={form.clearanceReason} onChange={updateForm} />
          <Field label="Defect notes" name="defectNotes" value={form.defectNotes} onChange={updateForm} />
          <label className="admin-check"><input name="inspectionAvailable" type="checkbox" checked={form.inspectionAvailable} onChange={updateForm} /><span>Inspection evidence available</span></label>
        </div>
        {form.type === "STOCK_LOT" ? (
          <fieldset className="admin-fieldset">
            <legend>Stock lot measurements</legend>
            <div className="admin-form-grid">
              <Field label="Total pieces" name="totalPieces" type="number" value={form.totalPieces} onChange={updateForm} required />
              <Field label="Total packages" name="totalPackages" type="number" value={form.totalPackages} onChange={updateForm} />
              <Field label="Weight (kg)" name="totalWeightKg" value={form.totalWeightKg} onChange={updateForm} />
              <Field label="Volume (CBM)" name="totalVolumeCbm" value={form.totalVolumeCbm} onChange={updateForm} />
              <Field label="Size range" name="sizeRange" value={form.sizeRange} onChange={updateForm} />
              <Field label="Pieces per package" name="piecesPerPackage" type="number" value={form.piecesPerPackage} onChange={updateForm} />
            </div>
          </fieldset>
        ) : (
          <fieldset className="admin-fieldset">
            <legend>Single style details</legend>
            <div className="admin-form-grid">
              <Field label="Style number" name="styleNumber" value={form.styleNumber} onChange={updateForm} required />
              <Field label="Fabric" name="fabric" value={form.fabric} onChange={updateForm} />
              <Field label="Pieces per carton" name="piecesPerCarton" type="number" value={form.piecesPerCarton} onChange={updateForm} />
              <Field label="Factory lead time (days)" name="factoryLeadTimeDays" type="number" value={form.factoryLeadTimeDays} onChange={updateForm} />
              <Field label="Style notes" name="styleNotes" value={form.styleNotes} onChange={updateForm} />
            </div>
          </fieldset>
        )}
        {mode === "create" ? (
          <fieldset className="admin-fieldset admin-translation-form">
            <legend>English source copy</legend>
            <Field label="English title" name="title" value={translations.en.title} onChange={updateTranslation} required dir="ltr" />
            <Field label="Summary" name="summary" value={translations.en.summary} onChange={updateTranslation} required dir="ltr" />
            <Field label="Description" name="description" value={translations.en.description} onChange={updateTranslation} required dir="ltr" />
          </fieldset>
        ) : null}
        <div className="admin-panel__actions">
          <button className="button button--primary" disabled={busy || isArchived} type="submit">{busy ? "Saving…" : mode === "create" ? "Create private record" : "Save business facts"}</button>
          {mode === "edit" ? <span>Saving facts never publishes a locale.</span> : <span>English copy is required to create the record.</span>}
        </div>
      </form>

      {mode === "edit" && product ? (
        <>
          <section className="admin-panel admin-translation-panel" aria-labelledby="translation-title">
            <div className="admin-panel__heading">
              <div>
                <p className="eyebrow">02 / language editions</p>
                <h2 id="translation-title">Review the words before they leave the ledger.</h2>
              </div>
              <div className="admin-locale-tabs" role="tablist" aria-label="Translation locale">
                <button className={locale === "en" ? "is-active" : ""} onClick={() => setLocale("en")} role="tab" aria-selected={locale === "en"} type="button">English</button>
                <button className={locale === "ar" ? "is-active" : ""} onClick={() => setLocale("ar")} role="tab" aria-selected={locale === "ar"} type="button">العربية</button>
              </div>
            </div>
            <form className={`admin-translation-form${locale === "ar" ? " admin-translation-form--rtl" : ""}`} onSubmit={saveTranslation} dir={locale === "ar" ? "rtl" : "ltr"}>
              <Field label={locale === "ar" ? "Arabic title" : "English title"} name="title" value={currentTranslation.title} onChange={updateTranslation} required dir={locale === "ar" ? "rtl" : "ltr"} />
              <Field label="Summary" name="summary" value={currentTranslation.summary} onChange={updateTranslation} required dir={locale === "ar" ? "rtl" : "ltr"} />
              <Field label="Description" name="description" value={currentTranslation.description} onChange={updateTranslation} required dir={locale === "ar" ? "rtl" : "ltr"} />
              <Field label="SEO title" name="seoTitle" value={currentTranslation.seoTitle} onChange={updateTranslation} dir={locale === "ar" ? "rtl" : "ltr"} />
              <Field label="SEO description" name="seoDescription" value={currentTranslation.seoDescription} onChange={updateTranslation} dir={locale === "ar" ? "rtl" : "ltr"} />
              <Field label="Share image alt" name="shareImageAlt" value={currentTranslation.shareImageAlt} onChange={updateTranslation} dir={locale === "ar" ? "rtl" : "ltr"} />
              <div className="admin-panel__actions">
                <button className="button button--primary" disabled={busy || isArchived} type="submit">{busy ? "Saving…" : `Save ${locale.toUpperCase()} draft`}</button>
                {locale === "en" ? <button className="button button--secondary" disabled={translationBusy || !translations.en.description} onClick={generateArabicDraft} type="button">{translationBusy ? "Generating…" : "Generate Arabic draft"}</button> : null}
                <span>Generated Arabic remains private until a staff member saves and publishes it.</span>
              </div>
            </form>
            <div className="admin-publication-strip">
              <div>
                <span>English</span>
                <strong data-state={enPublished ? "published" : "draft"}>{enPublished ? (enDraftChanges ? "Public · changes waiting" : "Public") : "Private draft"}</strong>
                {enPublished && enDraftChanges ? <>
                  <button disabled={busy || isArchived || !translations.en.title} onClick={() => changePublication("publish_locale", "en")} type="button">Publish changes</button>
                  <button disabled={busy || isArchived} onClick={() => changePublication("unpublish_locale", "en")} type="button">Unpublish</button>
                </> : <button disabled={busy || isArchived || !translations.en.title} onClick={() => changePublication(enPublished ? "unpublish_locale" : "publish_locale", "en")} type="button">{enPublished ? "Unpublish" : "Publish English"}</button>}
              </div>
              <div>
                <span>Arabic</span>
                <strong data-state={arPublished ? "published" : "draft"}>{arPublished ? (arDraftChanges ? "Public · changes waiting" : "Public") : "Private draft"}</strong>
                {arPublished && arDraftChanges ? <>
                  <button disabled={busy || isArchived || !translations.ar.title} onClick={() => changePublication("publish_locale", "ar")} type="button">Publish changes</button>
                  <button disabled={busy || isArchived} onClick={() => changePublication("unpublish_locale", "ar")} type="button">Unpublish</button>
                </> : <button disabled={busy || isArchived || !translations.ar.title} onClick={() => changePublication(arPublished ? "unpublish_locale" : "publish_locale", "ar")} type="button">{arPublished ? "Unpublish" : "Publish Arabic"}</button>}
              </div>
            </div>
          </section>

          <section className="admin-panel admin-media-panel" aria-labelledby="media-title">
            <div className="admin-panel__heading">
              <div><p className="eyebrow">03 / warehouse evidence</p><h2 id="media-title">Attach controlled image proof.</h2></div>
              <label className="button button--secondary admin-upload-button">{uploadBusy ? "Verifying…" : "Add image"}<input accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploadBusy || isArchived} onChange={uploadMedia} type="file" /></label>
            </div>
            {product.media.length ? (
              <div className="admin-media-grid">
                {product.media.map((media) => (
                  <figure key={media.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={media.url} alt={media.altText ?? ""} />
                    <figcaption>{media.isPrimary ? "Primary evidence" : `Evidence ${media.sortOrder + 1}`}</figcaption>
                  </figure>
                ))}
              </div>
            ) : <p className="admin-muted">No verified media is attached. Public publication should wait for warehouse evidence.</p>}
          </section>

          <section className="admin-panel admin-actions-panel" aria-labelledby="record-actions-title">
            <div className="admin-panel__heading"><div><p className="eyebrow">04 / record control</p><h2 id="record-actions-title">Close, copy, or restore this record.</h2></div></div>
            <div className="admin-record-actions">
              <button className="button button--secondary" disabled={busy} onClick={duplicate} type="button">Duplicate record</button>
              {product.status === "ARCHIVED" ? <button className="button button--primary" disabled={busy} onClick={() => productAction("restore")} type="button">Restore as draft</button> : <><button className="button button--secondary" disabled={busy} onClick={() => productAction("sold_out")} type="button">Mark sold out</button><button className="button button--danger" disabled={busy} onClick={() => productAction("archive")} type="button">Archive record</button></>}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
