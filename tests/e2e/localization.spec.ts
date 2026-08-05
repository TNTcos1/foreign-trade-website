import { expect, test } from "@playwright/test"

test("server-renders English and Arabic document language and direction", async ({
  page,
}) => {
  await page.goto("/en")
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Stock")

  await page.goto("/ar")
  await expect(page.locator("html")).toHaveAttribute("lang", "ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("مخزون")
})

test("locale switching preserves the current path and source query parameters", async ({
  page,
}) => {
  await page.goto("/en/trust?utm_source=expo&utm_medium=qr")

  await page.getByRole("link", { name: /العربية/ }).click()

  await expect(page).toHaveURL(
    /\/ar\/trust\?utm_source=expo&utm_medium=qr$/,
  )
  await expect(page.locator("html")).toHaveAttribute("lang", "ar")
})

test("mobile navigation is operable by keyboard and keeps inquiry entry visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/en")

  const inquiryEntry = page.getByRole("link", { name: /Inquiry list, 0 items/ })
  await expect(inquiryEntry).toBeVisible()

  const menuButton = page.getByRole("button", { name: "Open navigation" })
  await expect(menuButton).toBeVisible()
  await menuButton.focus()
  await expect(menuButton).toBeFocused()
  await expect(menuButton).toHaveCSS("outline-style", "solid")
  await menuButton.press("Enter")

  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible()
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", {
      name: "Stock lots",
      exact: true,
    }),
  ).toBeVisible()
  await expect(inquiryEntry).toBeVisible()
})

test("unsupported locale segments render a bilingual 404", async ({ page }) => {
  const response = await page.goto("/fr")

  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Page not found",
  )
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "الصفحة غير موجودة",
  )
})
