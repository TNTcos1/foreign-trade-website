import { expect, test } from "@playwright/test"

test("buyer can browse and filter current public stock", async ({ page }) => {
  await page.goto("/en/stock")

  await expect(
    page.getByRole("heading", { level: 1, name: "Current wholesale stock" }),
  ).toBeVisible()
  await expect(page.getByTestId("product-card")).toHaveCount(3)
  await expect(
    page.getByTestId("product-card").getByText("Sold out", { exact: true }),
  ).toBeVisible()

  await page.getByLabel("Search stock").fill("Cotton Crew-Neck")
  await page.getByRole("button", { name: "Apply filters" }).click()

  await expect(page).toHaveURL(/\/en\/stock\?search=Cotton(?:\+|%20)Crew-Neck/)
  await expect(page.getByTestId("product-card")).toHaveCount(1)
  await expect(
    page.getByRole("link", {
      name: /Factory Booking Cotton Crew-Neck T-Shirt/i,
    }),
  ).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/en\/stock$/,
  )
})

test("Arabic stock-lot catalog is localized and RTL", async ({ page }) => {
  await page.goto("/ar/stock-lots")

  await expect(page.locator("html")).toHaveAttribute("lang", "ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(
    page.getByRole("heading", { level: 1, name: "دفعات المخزون المتاحة" }),
  ).toBeVisible()
  await expect(page.getByTestId("product-card")).toHaveCount(2)
  await expect(
    page.getByRole("link", { name: /تشكيلة ملابس صيفية جاهزة بالمخزون/ }),
  ).toBeVisible()
})

test("single-style route only lists factory-booking styles", async ({ page }) => {
  await page.goto("/en/single-styles")

  await expect(
    page.getByRole("heading", { level: 1, name: "Available single styles" }),
  ).toBeVisible()
  await expect(page.getByTestId("product-card")).toHaveCount(1)
  await expect(
    page.getByRole("link", { name: /Factory Booking Cotton Crew-Neck T-Shirt/i }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: /Mixed Summer Clothing Ready Stock Lot/i }),
  ).toHaveCount(0)
})

test("mobile buyer can open the filter drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/en/stock")

  const drawer = page.getByText("Filter stock", { exact: true })
  await expect(drawer).toBeVisible()
  await drawer.click()
  await expect(page.getByLabel("Product type")).toBeVisible()
  await expect(page.getByLabel("Sort by")).toBeVisible()
})

test("ready-stock detail leads with media proof and inquiry action", async ({
  page,
}) => {
  await page.goto("/en/products/DEV-STOCK-READY-001")

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Mixed Summer Clothing Ready Stock Lot",
    }),
  ).toBeVisible()
  const mediaRegion = page.getByRole("region", {
    name: "Product media and condition proof",
  })
  const productHeading = page.getByRole("heading", {
    level: 1,
    name: "Mixed Summer Clothing Ready Stock Lot",
  })
  await expect(mediaRegion).toBeVisible()
  expect(
    await mediaRegion.evaluate((region, heading) =>
      Boolean(region.compareDocumentPosition(heading as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
      await productHeading.elementHandle(),
    ),
  ).toBe(true)
  await expect(
    page.getByRole("link", { name: "Add to inquiry list" }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Ask on WhatsApp" }),
  ).toBeVisible()
  await expect(page.getByText("Verified Jul 31, 2026")).toBeVisible()

  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "{}",
  )
  expect(jsonLd).toMatchObject({
    "@type": "Product",
    sku: "DEV-STOCK-READY-001",
    availability: "https://schema.org/InStock",
  })
  expect(jsonLd.offers).toMatchObject({
    "@type": "AggregateOffer",
    lowPrice: "1.2",
    highPrice: "1.55",
  })
})

test("sold-out detail stays public without an inquiry action", async ({ page }) => {
  await page.goto("/en/products/DEV-STOCK-SOLD-001")

  await expect(page.getByText("Sold out", { exact: true })).toBeVisible()
  await expect(
    page.getByText("This stock is unavailable for inquiry."),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Add to inquiry list" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("heading", { level: 2, name: "Related current stock" }),
  ).toBeVisible()
})

test("quote-only detail does not publish an invented offer", async ({ page }) => {
  await page.goto("/en/products/DEV-STYLE-BOOKING-001")

  await expect(page.getByText("Contact for quote", { exact: true })).toBeVisible()
  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "{}",
  )
  expect(jsonLd).not.toHaveProperty("offers")
})
