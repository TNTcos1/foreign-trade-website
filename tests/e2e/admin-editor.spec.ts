import { randomUUID } from "node:crypto"

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test"

import { prisma } from "@/lib/prisma"

import { installSeedAdminSession } from "./admin-session-fixture"
const adminEmail = "admin@clearance.local.invalid"
const productCode = "DEV-STOCK-READY-001"
const contentSlug = "markets/yemen"

type BrowserDiagnostics = {
  consoleErrors: string[]
  failedRequests: string[]
  allowedConsoleErrors: string[]
}

function isAdminApplicationRequest(url: string): boolean {
  const pathname = new URL(url).pathname
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/")
}

const productBusinessFieldNames = [
  "code",
  "type",
  "status",
  "category",
  "genderAge",
  "season",
  "tags",
  "sourceType",
  "sourceLocation",
  "qualityGrade",
  "clearanceReason",
  "defectNotes",
  "inspectionAvailable",
  "purchaseUnit",
  "minimumOrderQuantity",
  "tradeTerms",
  "currency",
  "referencePriceMin",
  "referencePriceMax",
  "priceBasis",
  "availableQuantity",
  "totalPieces",
  "totalPackages",
  "totalWeightKg",
  "totalVolumeCbm",
  "sizeRange",
  "piecesPerPackage",
  "styleNumber",
  "fabric",
  "styleNotes",
  "piecesPerCarton",
  "factoryLeadTimeDays",
] as const

test.describe.configure({ mode: "serial", timeout: 120_000 })

test.describe("admin product and content editors", () => {
  const diagnosticsByPage = new WeakMap<Page, BrowserDiagnostics>()

  test.beforeEach(async ({ page }) => {
    const diagnostics: BrowserDiagnostics = { consoleErrors: [], failedRequests: [], allowedConsoleErrors: [] }
    diagnosticsByPage.set(page, diagnostics)
    page.on("console", (message) => {
      if (message.type() !== "error") return
      const location = message.location().url
      diagnostics.consoleErrors.push(location ? `${message.text()} — ${location}` : message.text())
    })
    page.on("requestfailed", (request) => {
      if (!isAdminApplicationRequest(request.url()) || request.failure()?.errorText === "net::ERR_ABORTED") return
      diagnostics.failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "request failed"}`)
    })
    page.on("response", (response) => {
      if (response.status() < 500 || !isAdminApplicationRequest(response.url())) return
      diagnostics.failedRequests.push(`${response.request().method()} ${response.url()} — HTTP ${response.status()}`)
    })
  })

  function allowExpectedProductMutationRejection(page: Page, productId: string) {
    const diagnostics = diagnosticsByPage.get(page)
    if (!diagnostics) {
      throw new Error("Browser diagnostics were not installed for this page.")
    }
    const url = new URL(
      `/api/admin/products/${encodeURIComponent(productId)}`,
      page.url(),
    ).href
    diagnostics.allowedConsoleErrors.push(
      `Failed to load resource: the server responded with a status of 400 (Bad Request) — ${url}`,
    )
  }

  function allowExpectedContentMutationRejection(page: Page) {
    const diagnostics = diagnosticsByPage.get(page)
    if (!diagnostics) {
      throw new Error("Browser diagnostics were not installed for this page.")
    }
    const url = new URL(`/api/admin/content/${contentSlug}`, page.url()).href
    diagnostics.allowedConsoleErrors.push(
      `Failed to load resource: the server responded with a status of 400 (Bad Request) — ${url}`,
    )
  }

  async function signOut(page: Page) {
    const response = await page.request.post("/api/admin/auth/logout", {
      headers: { origin: new URL(page.url()).origin },
    })
    expect(response.ok()).toBe(true)
  }

  test.afterEach(async ({ page }, testInfo) => {
    let cleanupError: unknown
    try {
      await signOut(page)
    } catch (error) {
      cleanupError = error
    }

    const diagnostics = diagnosticsByPage.get(page)
    const originalTestFailed = testInfo.errors.length > 0 || testInfo.status !== testInfo.expectedStatus
    if (cleanupError) {
      if (!originalTestFailed) throw cleanupError
      await testInfo.attach("session-cleanup-error", {
        body: cleanupError instanceof Error ? cleanupError.stack ?? cleanupError.message : String(cleanupError),
        contentType: "text/plain",
      })
    }
    if (diagnostics && (diagnostics.consoleErrors.length || diagnostics.failedRequests.length)) {
      const body = JSON.stringify(diagnostics, null, 2)
      if (!originalTestFailed && !cleanupError) {
        expect(
          diagnostics.consoleErrors.filter((message) => !diagnostics.allowedConsoleErrors.includes(message)),
          "Unexpected browser console errors",
        ).toEqual([])
        expect(
          diagnostics.failedRequests.filter((request) => !request.includes("HTTP 4")),
          "Unexpected failed admin application requests",
        ).toEqual([])
      } else {
        await testInfo.attach("admin-browser-diagnostics", { body, contentType: "application/json" })
      }
    }
  })

  type Locale = "en" | "ar"
  type PublicationState = "PUBLISHED" | "DRAFT"
  type PublicationStates = Record<Locale, PublicationState>

  type ProductTranslation = {
    title: string
    summary: string
    description: string
    seoTitle: string
    seoDescription: string
    shareImageAlt: string
  }

  type ContentTranslation = {
    title: string
    seoTitle: string
    summary: string
    seoDescription: string
    body: string
  }

  type ProductBusinessSnapshot = {
    values: Record<string, string>
    checked: Record<string, boolean>
  }

  type ProductSnapshot = {
    business: ProductBusinessSnapshot
    translations: Record<Locale, ProductTranslation>
    publicationStates: PublicationStates
  }

  type ContentSnapshot = {
    translations: Record<Locale, ContentTranslation>
    publicationStates: PublicationStates
  }

  async function signIn(page: Page) {
    await installSeedAdminSession(page, adminEmail)
    await expect(page).toHaveURL(/\/admin$/)
  }

  async function openProductEditor(page: Page): Promise<string> {
    await page.goto("/admin/products")
    const row = page.getByRole("row", { name: new RegExp(productCode) })
    await expect(row).toBeVisible()
    const link = row.getByRole("link", { name: new RegExp(productCode) }).first()
    const href = await link.getAttribute("href")
    if (!href) throw new Error("The seeded product editor link has no href.")
    const productId = decodeURIComponent(href.split("/").pop() ?? "")
    if (!productId) throw new Error("The seeded product editor link has no product id.")
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/admin/products/${productId}$`))
    await expect(page.locator('[name="category"]')).toBeVisible()
    return productId
  }

  async function openProductEditorById(page: Page, productId: string) {
    await page.goto(`/admin/products/${encodeURIComponent(productId)}`)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  }

  async function openContentEditor(page: Page) {
    await page.goto("/admin/content")
    const pageLink = page.getByRole("link", { name: new RegExp(contentSlug) })
    await expect(pageLink).toBeVisible()
    await pageLink.click()
    await expect(page).toHaveURL(new RegExp(`/admin/content/${contentSlug}$`), { timeout: 30_000 })
    await expect(page.getByRole("tab", { name: "English", exact: true })).toBeVisible()
  }

  async function openContentEditorFromDatabase(page: Page) {
    await page.goto(`/admin/content/${contentSlug}`)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  }

  function publicationControl(page: Page, locale: Locale): Locator {
    const label = locale === "en" ? "English" : "Arabic"
    return page.locator(".admin-publication-strip > div").filter({ hasText: label }).first()
  }

  async function publicationState(control: Locator): Promise<PublicationState> {
    return await control.locator("strong").getAttribute("data-state") === "published"
      ? "PUBLISHED"
      : "DRAFT"
  }

  async function readPublicationStates(page: Page): Promise<PublicationStates> {
    return {
      en: await publicationState(publicationControl(page, "en")),
      ar: await publicationState(publicationControl(page, "ar")),
    }
  }

  async function readPersistedProductPublicationStates(page: Page, productId: string): Promise<PublicationStates> {
    await openProductEditorById(page, productId)
    return readPublicationStates(page)
  }

  async function readPersistedContentPublicationStates(page: Page): Promise<PublicationStates> {
    await openContentEditorFromDatabase(page)
    return readPublicationStates(page)
  }

  async function setProductPublication(
    page: Page,
    productId: string,
    locale: Locale,
    desired: PublicationState,
  ) {
    const current = await readPersistedProductPublicationStates(page, productId)
    const control = publicationControl(page, locale)
    if (current[locale] === desired) {
      if (desired === "PUBLISHED" && await control.getByRole("button", { name: "Publish changes", exact: true }).count()) {
        await control.getByRole("button", { name: "Publish changes", exact: true }).click()
        await expect(page.getByRole("status")).toBeVisible()
      }
      return
    }

    const buttonName = desired === "PUBLISHED"
      ? `Publish ${locale === "en" ? "English" : "Arabic"}`
      : "Unpublish"
    await publicationControl(page, locale).getByRole("button", { name: buttonName, exact: true }).click()
    await expect(page.getByRole("status")).toBeVisible()

    const persisted = await readPersistedProductPublicationStates(page, productId)
    expect(persisted[locale]).toBe(desired)
  }

  async function setContentPublication(page: Page, locale: Locale, desired: PublicationState) {
    const current = await readPersistedContentPublicationStates(page)
    const control = publicationControl(page, locale)
    if (current[locale] === desired) {
      if (desired === "PUBLISHED" && await control.getByRole("button", { name: "Publish changes", exact: true }).count()) {
        await control.getByRole("button", { name: "Publish changes", exact: true }).click()
        await expect(page.getByRole("status")).toBeVisible()
      }
      return
    }

    await control.getByRole("button", {
      name: desired === "PUBLISHED" ? "Publish" : "Unpublish",
      exact: true,
    }).click()
    await expect(page.getByRole("status")).toBeVisible()

    const persisted = await readPersistedContentPublicationStates(page)
    expect(persisted[locale]).toBe(desired)
  }

  async function restoreProductPublicationStates(page: Page, productId: string, desired: PublicationStates) {
    if (desired.en === "DRAFT" && desired.ar === "PUBLISHED") {
      throw new Error("English-first publication cannot restore an Arabic-only public state.")
    }

    const current = await readPersistedProductPublicationStates(page, productId)
    if (desired.en === "DRAFT") {
      if (current.en === "PUBLISHED") {
        await setProductPublication(page, productId, "en", "DRAFT")
      } else if (current.ar === "PUBLISHED") {
        await setProductPublication(page, productId, "ar", "DRAFT")
      }
      return
    }

    if (desired.ar === "DRAFT" && current.ar === "PUBLISHED") {
      await setProductPublication(page, productId, "ar", "DRAFT")
    }
    await setProductPublication(page, productId, "en", "PUBLISHED")
    if (desired.ar === "PUBLISHED") {
      await setProductPublication(page, productId, "ar", "PUBLISHED")
    }
  }

  async function restoreContentPublicationStates(page: Page, desired: PublicationStates) {
    if (desired.en === "DRAFT" && desired.ar === "PUBLISHED") {
      throw new Error("English-first publication cannot restore an Arabic-only public state.")
    }

    const current = await readPersistedContentPublicationStates(page)
    if (desired.en === "DRAFT") {
      if (current.en === "PUBLISHED") {
        await setContentPublication(page, "en", "DRAFT")
      } else if (current.ar === "PUBLISHED") {
        await setContentPublication(page, "ar", "DRAFT")
      }
      return
    }

    if (desired.ar === "DRAFT" && current.ar === "PUBLISHED") {
      await setContentPublication(page, "ar", "DRAFT")
    }
    await setContentPublication(page, "en", "PUBLISHED")
    if (desired.ar === "PUBLISHED") {
      await setContentPublication(page, "ar", "PUBLISHED")
    }
  }

  function productTranslationField(page: Page, name: string): Locator {
    return page.locator(`.admin-translation-form [name="${name}"]`)
  }

  async function readProductTranslation(page: Page, locale: Locale): Promise<ProductTranslation> {
    await page.getByRole("tab", { name: locale === "en" ? "English" : "العربية", exact: true }).click()
    return {
      title: await productTranslationField(page, "title").inputValue(),
      summary: await productTranslationField(page, "summary").inputValue(),
      description: await productTranslationField(page, "description").inputValue(),
      seoTitle: await productTranslationField(page, "seoTitle").inputValue(),
      seoDescription: await productTranslationField(page, "seoDescription").inputValue(),
      shareImageAlt: await productTranslationField(page, "shareImageAlt").inputValue(),
    }
  }

  async function fillProductTranslation(page: Page, locale: Locale, translation: ProductTranslation) {
    await page.getByRole("tab", { name: locale === "en" ? "English" : "العربية", exact: true }).click()
    await productTranslationField(page, "title").fill(translation.title)
    await productTranslationField(page, "summary").fill(translation.summary)
    await productTranslationField(page, "description").fill(translation.description)
    await productTranslationField(page, "seoTitle").fill(translation.seoTitle)
    await productTranslationField(page, "seoDescription").fill(translation.seoDescription)
    await productTranslationField(page, "shareImageAlt").fill(translation.shareImageAlt)
  }

  async function readProductBusiness(page: Page): Promise<ProductBusinessSnapshot> {
    const values: Record<string, string> = {}
    const checked: Record<string, boolean> = {}
    for (const name of productBusinessFieldNames) {
      const control = page.locator(`[name="${name}"]`).first()
      if (await control.count() === 0) continue
      if (await control.getAttribute("type") === "checkbox") {
        checked[name] = await control.isChecked()
      } else {
        values[name] = await control.inputValue()
      }
    }
    if (!("status" in values) || !("availableQuantity" in values)) {
      throw new Error("Product business controls were not ready for snapshot capture.")
    }
    return { values, checked }
  }

  async function restoreProductBusiness(page: Page, snapshot: ProductBusinessSnapshot) {
    for (const [name, value] of Object.entries(snapshot.values)) {
      const control = page.locator(`[name="${name}"]`).first()
      if (await control.evaluate((element) => element.tagName) === "SELECT") {
        await control.selectOption(value)
      } else {
        await control.fill(value)
      }
    }
    for (const [name, checked] of Object.entries(snapshot.checked)) {
      const control = page.locator(`[name="${name}"]`).first()
      if (await control.isChecked() !== checked) {
        await control.setChecked(checked)
      }
    }
    await page.getByRole("button", { name: "Save business facts", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Business facts saved. Publication states were not changed.")
  }

  async function saveProductTranslation(page: Page, locale: Locale) {
    await page.getByRole("button", { name: `Save ${locale.toUpperCase()} draft`, exact: true }).click()
    await expect(page.getByRole("status")).toHaveText(`${locale.toUpperCase()} translation saved as a draft.`)
  }

  async function saveContentTranslation(page: Page, locale: Locale) {
    await page.getByRole("button", { name: `Save ${locale.toUpperCase()} draft`, exact: true }).click()
    await expect(page.getByRole("status")).toHaveText(`${locale.toUpperCase()} draft saved.`)
  }

  async function expectProductPublic(page: Page, locale: Locale, title: string, code = productCode) {
    const response = await page.goto(`/${locale}/products/${code}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible()
  }

  async function expectContentPublic(page: Page, locale: Locale, translation: ContentTranslation) {
    const response = await page.goto(`/${locale}/markets/yemen`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1, name: translation.title, exact: true })).toBeVisible()
    const bodyMarker = translation.body.split(/\r?\n/).find((line) => line.trim() && !line.trim().startsWith("#"))?.trim()
    expect(bodyMarker).toBeTruthy()
    await expect(page.getByText(bodyMarker!, { exact: true })).toBeVisible()
  }

  async function expectProductPrivate(page: Page, locale: Locale) {
    await page.goto(`/${locale}/products/${productCode}`)
    await expect(page.getByRole("heading", { level: 1, name: /Stock record unavailable/ })).toBeVisible()
  }

  async function expectContentPrivate(page: Page, locale: Locale) {
    await page.goto(`/${locale}/markets/yemen`)
    await expect(page.getByRole("heading", { level: 1, name: "Page not found · الصفحة غير موجودة", exact: true })).toBeVisible()
  }

  async function readContentTranslation(page: Page, locale: Locale): Promise<ContentTranslation> {
    await page.getByRole("tab", { name: locale === "en" ? "English" : "العربية", exact: true }).click()
    return {
      title: await page.getByLabel("Title *", { exact: true }).inputValue(),
      seoTitle: await page.getByLabel("SEO title", { exact: true }).inputValue(),
      summary: await page.getByLabel("Summary", { exact: true }).inputValue(),
      seoDescription: await page.getByLabel("SEO description", { exact: true }).inputValue(),
      body: await page.locator(".admin-translation-form textarea").inputValue(),
    }
  }

  async function fillContentTranslation(page: Page, translation: ContentTranslation) {
    await page.getByLabel("Title *", { exact: true }).fill(translation.title)
    await page.getByLabel("SEO title", { exact: true }).fill(translation.seoTitle)
    await page.getByLabel("Summary", { exact: true }).fill(translation.summary)
    await page.getByLabel("SEO description", { exact: true }).fill(translation.seoDescription)
    await page.locator(".admin-translation-form textarea").fill(translation.body)
  }

  async function restoreProductSnapshot(page: Page, productId: string, snapshot: ProductSnapshot) {
    await openProductEditorById(page, productId)
    await restoreProductBusiness(page, snapshot.business)
    for (const locale of ["en", "ar"] as Locale[]) {
      await fillProductTranslation(page, locale, snapshot.translations[locale])
      await saveProductTranslation(page, locale)
    }
    await restoreProductPublicationStates(page, productId, snapshot.publicationStates)
    if (snapshot.publicationStates.en === "PUBLISHED") {
      await expectProductPublic(page, "en", snapshot.translations.en.title)
      const expectedStatus = snapshot.business.values.status === "SOLD_OUT" ? "Sold out" : "Ready stock"
      await expect(page.locator(".product-heading__status").getByText(expectedStatus, { exact: true })).toBeVisible()
    }
  }

  async function restoreContentSnapshot(page: Page, snapshot: ContentSnapshot) {
    await openContentEditorFromDatabase(page)
    for (const locale of ["en", "ar"] as Locale[]) {
      await page.getByRole("tab", { name: locale === "en" ? "English" : "العربية", exact: true }).click()
      await fillContentTranslation(page, snapshot.translations[locale])
      await saveContentTranslation(page, locale)
    }
    await restoreContentPublicationStates(page, snapshot.publicationStates)
    for (const locale of ["en", "ar"] as Locale[]) {
      if (snapshot.publicationStates[locale] === "PUBLISHED") {
        await expectContentPublic(page, locale, snapshot.translations[locale])
      }
    }
  }

  test("ADMIN can edit, publish, unpublish, and restore a seeded product", async ({ page }) => {
    let captured = false
    let productId = ""
    let originalSnapshot: ProductSnapshot | null = null

    try {
      await signIn(page)
      await page.setViewportSize({ width: 390, height: 844 })
      productId = await openProductEditor(page)
      await expect(page.getByRole("heading", { level: 1, name: "Mixed Summer Clothing Ready Stock Lot", exact: true })).toBeVisible()
      await expect(page.getByRole("heading", { level: 2, name: "Business fields stay private until published." })).toBeVisible()
      await expect(page.locator('[name="category"]')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)

      originalSnapshot = {
        business: await readProductBusiness(page),
        translations: {
          en: await readProductTranslation(page, "en"),
          ar: await readProductTranslation(page, "ar"),
        },
        publicationStates: await readPersistedProductPublicationStates(page, productId),
      }
      captured = true

      const editedCategory = `${originalSnapshot.business.values.category} / Task 8D acceptance`
      await page.locator('[name="category"]').fill(editedCategory)
      await page.getByRole("button", { name: "Save business facts", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("Business facts saved. Publication states were not changed.")
      await expect(page.locator('[name="category"]')).toHaveValue(editedCategory)

      await saveProductTranslation(page, "en")

      await page.setViewportSize({ width: 1280, height: 900 })
      await page.getByRole("tab", { name: "العربية", exact: true }).click()
      await expect(page.locator('form[dir="rtl"]')).toHaveCount(1)
      await expect(productTranslationField(page, "title")).toHaveAttribute("dir", "rtl")
      await saveProductTranslation(page, "ar")

      await restoreProductPublicationStates(page, productId, { en: "DRAFT", ar: "DRAFT" })
      await openProductEditorById(page, productId)
      allowExpectedProductMutationRejection(page, productId)
      await publicationControl(page, "ar").getByRole("button", { name: "Publish Arabic", exact: true }).click()
      await expect(page.locator(".admin-alert")).toHaveText("English must be published before Arabic can be published.")
      expect(await readPersistedProductPublicationStates(page, productId)).toEqual({ en: "DRAFT", ar: "DRAFT" })

      await restoreProductPublicationStates(page, productId, { en: "PUBLISHED", ar: "PUBLISHED" })
      await expectProductPublic(page, "en", "Mixed Summer Clothing Ready Stock Lot")
      await expectProductPublic(page, "ar", "تشكيلة ملابس صيفية جاهزة بالمخزون")

      await restoreProductPublicationStates(page, productId, { en: "DRAFT", ar: "DRAFT" })
      await expectProductPrivate(page, "en")
      await expectProductPrivate(page, "ar")
    } finally {
      if (captured && originalSnapshot) {
        let cleanupError: unknown
        try {
          await restoreProductSnapshot(page, productId, originalSnapshot)
        } catch (error) {
          cleanupError = error
        }
        if (cleanupError) throw cleanupError
      }
    }
  })

  test("ADMIN can mark a seeded product sold out and restore its business state", async ({ page }) => {
    let captured = false
    let productId = ""
    let originalSnapshot: ProductSnapshot | null = null

    try {
      await signIn(page)
      productId = await openProductEditor(page)
      originalSnapshot = {
        business: await readProductBusiness(page),
        translations: {
          en: await readProductTranslation(page, "en"),
          ar: await readProductTranslation(page, "ar"),
        },
        publicationStates: await readPersistedProductPublicationStates(page, productId),
      }
      captured = true

      await openProductEditorById(page, productId)
      page.once("dialog", (dialog) => dialog.accept())
      await page.getByRole("button", { name: "Mark sold out", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("Record marked sold out.")
      await openProductEditorById(page, productId)
      await expect(page.getByText("Product record / SOLD OUT", { exact: true })).toBeVisible()

      const publicResponse = await page.goto(`/en/products/${productCode}`)
      expect(publicResponse?.status()).toBe(200)
      await expect(
        page.locator(".product-heading__status").getByText("Sold out", { exact: true }),
      ).toBeVisible()
    } finally {
      if (captured && originalSnapshot) {
        let cleanupError: unknown
        try {
          await restoreProductSnapshot(page, productId, originalSnapshot)
        } catch (error) {
          cleanupError = error
        }
        if (cleanupError) throw cleanupError
      }
    }
  })

  test("ADMIN can create and clean up a temporary product through its lifecycle", async ({ page }, testInfo: TestInfo) => {
    const productCode = `E2E-T8D-${randomUUID().slice(0, 8).toUpperCase()}`
    const duplicateCode = `${productCode}-COPY`
    const productIds: string[] = []
    const mediaKey = `staging/media/${randomUUID()}`
    const mediaBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
    const mediaDeclaration = {
      fileName: "task-8d-proof.png",
      contentType: "image/png",
      size: mediaBytes.length,
    }
    let presignBody: unknown
    let uploadMethod = ""
    let uploadContentType = ""
    let uploadBody: Buffer | null = null
    let completionBody: unknown
    let cleanupError: unknown

    try {
      await signIn(page)
      await page.goto("/admin/products/new")
      await page.locator('[name="code"]').fill(productCode)
      await page.locator('[name="status"]').selectOption("DRAFT")
      await page.locator('[name="category"]').fill("Task 8D temporary stock")
      await page.locator('[name="purchaseUnit"]').fill("piece")
      await page.locator('[name="totalPieces"]').fill("24")
      await productTranslationField(page, "title").fill("Task 8D temporary product")
      await productTranslationField(page, "summary").fill("A deterministic temporary product for browser acceptance.")
      await productTranslationField(page, "description").fill("This deterministic Task 8D product exists only for browser acceptance and cleanup.")
      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url() === new URL("/api/admin/products", page.url()).href &&
          response.request().method() === "POST",
        { timeout: 30_000 },
      )
      await page.getByRole("button", { name: "Create private record", exact: true }).click()
      const createResponse = await createResponsePromise
      expect(createResponse.status()).toBe(201)
      const createBody = await createResponse.json() as { product?: { id?: string } }
      const createdProductId = createBody.product?.id
      if (!createdProductId) throw new Error("The product creation response had no product id.")
      productIds.push(createdProductId)

      await expect(page).toHaveURL(new RegExp(`/admin/products/${createdProductId}$`), { timeout: 30_000 })
      await expect(page.getByText("Product record / DRAFT", { exact: true })).toBeVisible()
      await expect(publicationControl(page, "en").getByText("Private draft", { exact: true })).toBeVisible()
      await expect(productTranslationField(page, "title")).toHaveValue("Task 8D temporary product")

      await page.locator('[name="status"]').selectOption("READY_STOCK")
      await page.getByRole("button", { name: "Save business facts", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("Business facts saved. Publication states were not changed.")

      await page.getByRole("button", { name: "Generate Arabic draft", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("Arabic text is ready for review. Save it as a draft before publishing.")
      await page.getByRole("tab", { name: "العربية", exact: true }).click()
      await expect(productTranslationField(page, "title")).toHaveValue("مسودة Task 8D temporary product")
      await page.getByRole("button", { name: "Save AR draft", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("AR translation saved as a draft.")
      await expect(publicationControl(page, "en").getByText("Private draft", { exact: true })).toBeVisible()
      await expect(publicationControl(page, "ar").getByText("Private draft", { exact: true })).toBeVisible()

      await page.route("**/api/admin/media/presign", async (route) => {
        presignBody = route.request().postDataJSON()
        await route.fulfill({
          contentType: "application/json",
          json: {
            ok: true,
            upload: {
              key: mediaKey,
              uploadUrl: "http://local-media.test/upload",
              fields: { policy: "task-8d" },
            },
          },
        })
      })
      await page.route("http://local-media.test/upload", async (route) => {
        uploadMethod = route.request().method()
        uploadContentType = route.request().headers()["content-type"] ?? ""
        uploadBody = route.request().postDataBuffer()
        await route.fulfill({ status: 204 })
      })
      await page.route("http://local-media.test/public/task-8d-proof.webp", async (route) => {
        await route.fulfill({ body: mediaBytes, contentType: "image/png" })
      })
      await page.route("**/api/admin/media/complete", async (route) => {
        completionBody = route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          json: {
            ok: true,
            media: {
              id: randomUUID(),
              mediaType: "IMAGE",
              url: "http://local-media.test/public/task-8d-proof.webp",
              altText: "task-8d-proof",
              sortOrder: 0,
              isPrimary: true,
            },
          },
        })
      })

      await page.locator('.admin-media-panel input[type="file"]').setInputFiles({
        name: mediaDeclaration.fileName,
        mimeType: mediaDeclaration.contentType,
        buffer: mediaBytes,
      })
      await expect(page.getByRole("status")).toHaveText("Image verified and attached to this product.")
      expect(presignBody).toEqual(mediaDeclaration)
      expect(uploadMethod).toBe("POST")
      expect(uploadContentType).toContain("multipart/form-data")
      expect(Buffer.from(uploadBody ?? []).includes(mediaBytes)).toBe(true)
      expect(completionBody).toEqual({
        productId: productIds[0],
        key: mediaKey,
        declaration: mediaDeclaration,
        altText: "task-8d-proof",
        sortOrder: 0,
        isPrimary: true,
      })
      await expect(page.getByRole("img", { name: "task-8d-proof" })).toBeVisible()
      await expect(page.getByText("Primary evidence", { exact: true })).toBeVisible()

      allowExpectedProductMutationRejection(page, productIds[0])
      await page.getByRole("button", { name: "Publish Arabic", exact: true }).click()
      await expect(page.locator(".admin-alert")).toHaveText("English must be published before Arabic can be published.")
      await expect(publicationControl(page, "en").getByText("Private draft", { exact: true })).toBeVisible()
      await expect(publicationControl(page, "ar").getByText("Private draft", { exact: true })).toBeVisible()

      await page.getByRole("tab", { name: "English", exact: true }).click()
      await page.getByRole("button", { name: "Publish English", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("EN is now public.")
      await expect(publicationControl(page, "en").getByText("Public", { exact: true })).toBeVisible()

      const revisedTitle = "Task 8D reviewed temporary product"
      await productTranslationField(page, "title").fill(revisedTitle)
      await page.getByRole("button", { name: "Save EN draft", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("EN translation saved as a draft.")
      await expect(publicationControl(page, "en").getByText("Public · changes waiting", { exact: true })).toBeVisible()
      await expect(publicationControl(page, "en").getByRole("button", { name: "Publish changes", exact: true })).toBeVisible()
      await expect(publicationControl(page, "en").getByRole("button", { name: "Unpublish", exact: true })).toBeVisible()

      await expectProductPublic(page, "en", "Task 8D temporary product", productCode)
      await openProductEditorById(page, productIds[0])
      await publicationControl(page, "en").getByRole("button", { name: "Publish changes", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("EN is now public.")
      await expect(publicationControl(page, "en").getByText("Public", { exact: true })).toBeVisible()
      await expectProductPublic(page, "en", revisedTitle, productCode)
      await openProductEditorById(page, productIds[0])

      page.once("dialog", (dialog) => dialog.accept(duplicateCode))
      const duplicateResponsePromise = page.waitForResponse((response) => (
        response.request().method() === "POST"
        && new URL(response.url()).pathname === `/api/admin/products/${productIds[0]}`
      ))
      await page.getByRole("button", { name: "Duplicate record", exact: true }).click()
      const duplicateResponse = await duplicateResponsePromise
      expect(duplicateResponse.status()).toBe(201)
      const duplicatePayload = await duplicateResponse.json() as {
        ok?: unknown
        product?: { id?: unknown; code?: unknown }
      }
      expect(duplicatePayload).toMatchObject({ ok: true, product: { code: duplicateCode } })
      const duplicateId = duplicatePayload.product?.id
      if (typeof duplicateId !== "string") {
        throw new Error("Duplicate response did not include a product ID.")
      }
      productIds.push(duplicateId)
      await expect(page).toHaveURL(new RegExp(`/admin/products/${duplicateId}$`))
      await expect(page.getByText("Product record / DRAFT", { exact: true })).toBeVisible()
      await expect(page.getByText(duplicateCode, { exact: true })).toBeVisible()
      await expect(publicationControl(page, "en").getByText("Private draft", { exact: true })).toBeVisible()
      await expect(publicationControl(page, "ar").getByText("Private draft", { exact: true })).toBeVisible()

      page.once("dialog", (dialog) => dialog.accept())
      await page.getByRole("button", { name: "Archive record", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("Record archived.")
      await expect(page.getByText("Product record / ARCHIVED", { exact: true })).toBeVisible()
      await page.getByRole("button", { name: "Restore as draft", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("Record restored as a private draft.")
      await expect(page.getByText("Product record / DRAFT", { exact: true })).toBeVisible()
      await expect(publicationControl(page, "en").getByText("Private draft", { exact: true })).toBeVisible()
      await expect(publicationControl(page, "ar").getByText("Private draft", { exact: true })).toBeVisible()
    } finally {
      try {
        const productIdsForCleanup = [...productIds].reverse()
        await prisma.product.deleteMany({ where: { id: { in: productIdsForCleanup } } })
        expect(await prisma.product.count({ where: { id: { in: productIdsForCleanup } } })).toBe(0)
        expect(await prisma.product.count({ where: { code: { in: [productCode, duplicateCode] } } })).toBe(0)
      } catch (error) {
        cleanupError = error
      }
      if (cleanupError && testInfo.errors.length === 0) {
        throw cleanupError
      }
      if (cleanupError) {
        await testInfo.attach("product-cleanup-error", {
          body: cleanupError instanceof Error ? cleanupError.stack ?? cleanupError.message : String(cleanupError),
          contentType: "text/plain",
        })
      }
    }
  })

  test("ADMIN can edit bilingual market content and restore its publication state", async ({ page }) => {
    let captured = false
    let originalSnapshot: ContentSnapshot | null = null

    try {
      await signIn(page)
      await page.setViewportSize({ width: 1280, height: 900 })
      await openContentEditor(page)

      originalSnapshot = {
        publicationStates: await readPersistedContentPublicationStates(page),
        translations: {
          en: await readContentTranslation(page, "en"),
          ar: await readContentTranslation(page, "ar"),
        },
      }
      captured = true

      const editedEnglish = {
        ...originalSnapshot.translations.en,
        title: `${originalSnapshot.translations.en.title} [Task 8D English]`,
        body: `Task 8D English body marker.\n\n${originalSnapshot.translations.en.body}`,
      }
      const editedArabic = {
        ...originalSnapshot.translations.ar,
        title: `${originalSnapshot.translations.ar.title} [Task 8D Arabic]`,
        body: `علامة محتوى اختبار Task 8D بالعربية.\n\n${originalSnapshot.translations.ar.body}`,
      }

      expect(originalSnapshot.publicationStates).toEqual({ en: "PUBLISHED", ar: "PUBLISHED" })

      await page.getByRole("tab", { name: "English", exact: true }).click()
      await fillContentTranslation(page, editedEnglish)
      await saveContentTranslation(page, "en")
      await expect(publicationControl(page, "en").getByText("Published · changes waiting", { exact: true })).toBeVisible()
      await expect(publicationControl(page, "en").getByRole("button", { name: "Publish changes", exact: true })).toBeVisible()
      await expect(publicationControl(page, "en").getByRole("button", { name: "Unpublish", exact: true })).toBeVisible()
      await expectContentPublic(page, "en", originalSnapshot.translations.en)
      await openContentEditorFromDatabase(page)
      await publicationControl(page, "en").getByRole("button", { name: "Publish changes", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("EN is now public.")
      await expect(publicationControl(page, "en").getByText("Published", { exact: true })).toBeVisible()
      await expectContentPublic(page, "en", editedEnglish)

      await openContentEditorFromDatabase(page)
      await page.getByRole("tab", { name: "العربية", exact: true }).click()
      await expect(page.locator('form[dir="rtl"]')).toHaveCount(1)
      await fillContentTranslation(page, editedArabic)
      await saveContentTranslation(page, "ar")
      await expect(publicationControl(page, "ar").getByText("Published · changes waiting", { exact: true })).toBeVisible()
      await expect(publicationControl(page, "ar").getByRole("button", { name: "Publish changes", exact: true })).toBeVisible()
      await expect(publicationControl(page, "ar").getByRole("button", { name: "Unpublish", exact: true })).toBeVisible()
      await expectContentPublic(page, "ar", originalSnapshot.translations.ar)
      await openContentEditorFromDatabase(page)
      await publicationControl(page, "ar").getByRole("button", { name: "Publish changes", exact: true }).click()
      await expect(page.getByRole("status")).toHaveText("AR is now public.")
      await expect(publicationControl(page, "ar").getByText("Published", { exact: true })).toBeVisible()
      await expectContentPublic(page, "ar", editedArabic)

      await restoreContentPublicationStates(page, { en: "DRAFT", ar: "DRAFT" })
      await openContentEditorFromDatabase(page)
      allowExpectedContentMutationRejection(page)
      await publicationControl(page, "ar").getByRole("button", { name: "Publish", exact: true }).click()
      await expect(page.locator(".admin-alert")).toHaveText("Publish English before Arabic.")
      expect(await readPersistedContentPublicationStates(page)).toEqual({ en: "DRAFT", ar: "DRAFT" })

      await restoreContentPublicationStates(page, { en: "PUBLISHED", ar: "PUBLISHED" })
      await expectContentPublic(page, "en", editedEnglish)
      await expectContentPublic(page, "ar", editedArabic)

      await restoreContentPublicationStates(page, { en: "DRAFT", ar: "DRAFT" })
      await expectContentPrivate(page, "en")
      await expectContentPrivate(page, "ar")

      await openContentEditorFromDatabase(page)
      await page.getByRole("tab", { name: "English", exact: true }).click()
      await saveContentTranslation(page, "en")
      await setContentPublication(page, "en", "PUBLISHED")
      await page.getByRole("tab", { name: "العربية", exact: true }).click()
      await saveContentTranslation(page, "ar")
      await setContentPublication(page, "ar", "PUBLISHED")
      await expectContentPublic(page, "en", editedEnglish)
      await expectContentPublic(page, "ar", editedArabic)

      await setContentPublication(page, "ar", "DRAFT")
      await expectContentPrivate(page, "ar")
      await expectContentPublic(page, "en", editedEnglish)
    } finally {
      if (captured && originalSnapshot) {
        let cleanupError: unknown
        try {
          await restoreContentSnapshot(page, originalSnapshot)
        } catch (error) {
          cleanupError = error
        }
        if (cleanupError) throw cleanupError
      }
    }
  })
})
