import { expect, test } from "@playwright/test"

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number)

    if (!channels || channels.length !== 3) {
      throw new Error(`Unsupported color: ${color}`)
    }

    const [red, green, blue] = channels.map((channel) => {
      const value = channel / 255
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4
    })

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }

  const foregroundLuminance = luminance(foreground)
  const backgroundLuminance = luminance(background)

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  )
}

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

  const navigation = page.getByRole("navigation", { name: "Main navigation" })
  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true")
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole("link").first()).toBeFocused()
  await expect(
    navigation.getByRole("link", {
      name: "Stock lots",
      exact: true,
    }),
  ).toBeVisible()
  await expect(inquiryEntry).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(navigation).toBeHidden()
  await expect(menuButton).toBeFocused()
})

test("skip link moves keyboard focus to the public main content", async ({
  page,
}) => {
  await page.goto("/en")

  const skipLink = page.getByRole("link", { name: "Skip to content" })
  await skipLink.focus()
  await skipLink.press("Enter")

  await expect(page.locator("#main-content")).toBeFocused()
})

test("public status and not-found text colors meet AA contrast", async ({
  page,
}) => {
  await page.goto("/en")

  const bookingContrast = await page.locator("body").evaluate((body) => {
    const badge = document.createElement("span")
    badge.className = "status-badge"
    badge.dataset.status = "booking"
    body.append(badge)

    const styles = getComputedStyle(badge)
    const colors = {
      foreground: styles.color,
      background: styles.backgroundColor,
    }
    badge.remove()
    return colors
  })

  expect(
    contrastRatio(bookingContrast.foreground, bookingContrast.background),
  ).toBeGreaterThanOrEqual(4.5)

  await page.goto("/fr")
  const eyebrow = page.locator(".not-found-page .eyebrow")
  const notFoundContrast = await eyebrow.evaluate((element) => {
    const styles = getComputedStyle(element)
    const background = getComputedStyle(
      element.closest(".not-found-page") as HTMLElement,
    )
    return {
      foreground: styles.color,
      background: background.backgroundColor,
    }
  })

  expect(
    contrastRatio(notFoundContrast.foreground, notFoundContrast.background),
  ).toBeGreaterThanOrEqual(4.5)
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
