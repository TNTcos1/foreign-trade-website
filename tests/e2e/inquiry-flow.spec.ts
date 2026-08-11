import { expect, test } from "@playwright/test"

const inquirySecret = "e2e-secret-with-enough-entropy-for-signing"

test.describe("multi-product inquiry flow", () => {
  test("buyer can build and edit a multi-product list from catalog cards", async ({ page }) => {
    await page.goto("/en/stock")

    const cards = page.getByTestId("product-card")
    await cards.nth(0).getByRole("button", { name: "Add to inquiry list" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("link", { name: /Inquiry list, 1 item/ })).toBeVisible()
    await expect(page.getByRole("dialog").getByText("DEV-STOCK-READY-001")).toBeVisible()

    await page.getByRole("dialog").getByRole("button", { name: "Continue browsing" }).click()
    await cards.nth(1).getByRole("button", { name: "Add to inquiry list" }).click()
    await expect(page.getByRole("link", { name: /Inquiry list, 2 items/ })).toBeVisible()

    const firstQuantity = page.getByRole("dialog").getByLabel("Requested quantity").first()
    await firstQuantity.fill("5000")
    await page.getByRole("dialog").getByLabel("Buyer note").first().fill("Need inspection video")
    await expect(firstQuantity).toHaveValue("5000")
    await page.getByRole("dialog").getByRole("button", { name: "Remove" }).last().click()
    await expect(page.getByRole("dialog").getByText("DEV-STYLE-BOOKING-001")).toHaveCount(0)

    await page.getByRole("dialog").getByRole("link", { name: "Review and submit" }).click()
    await expect(page).toHaveURL(/\/en\/inquiry$/)
    await expect(page.getByRole("heading", { level: 1, name: "Send your wholesale requirement" })).toBeVisible()
    await expect(page.getByText("DEV-STOCK-READY-001")).toBeVisible()
  })

  test("list survives refresh and Arabic locale switch without duplicating a product", async ({ page }) => {
    await page.goto("/en/products/DEV-STOCK-READY-001")
    await page.getByRole("button", { name: "Add to inquiry list" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Continue browsing" }).click()
    await page.getByRole("link", { name: "العربية" }).click()

    await expect(page).toHaveURL(/\/ar\/products\/DEV-STOCK-READY-001$/)
    await expect(page.getByRole("link", { name: /قائمة الاستفسار، 1 عناصر/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole("link", { name: /قائمة الاستفسار، 1 عناصر/ })).toBeVisible()
  })

  test("English buyer submits a structured inquiry and receives a safe WhatsApp follow-up", async ({ page }) => {
    await page.goto("/en/inquiry?product=DEV-STOCK-READY-001")
    await expect(page.getByRole("heading", { level: 1, name: "Send your wholesale requirement" })).toBeVisible()
    await expect(page.getByText("DEV-STOCK-READY-001")).toBeVisible()

    await page.getByLabel("Name").fill("Browser Buyer")
    await page.getByLabel("Country code").fill("YE")
    await page.getByLabel("WhatsApp number").fill("+967 700 000 000")
    await page.getByLabel("Company (optional)").fill("Browser Trading")
    await page.getByLabel("General requirement (optional)").fill("Please confirm FOB Xiamen packing and inspection.")
    await page.waitForTimeout(2100)
    await page.getByRole("button", { name: "Submit inquiry" }).click()

    await expect(page).toHaveURL(/\/en\/inquiry\/success\/INQ-\d{8}-[A-F0-9]{8}$/)
    await expect(page.getByRole("heading", { level: 1, name: "Your quotation request is in the trade ledger." })).toBeVisible()
    const inquiryNumber = await page.locator(".inquiry-success__number strong").textContent()
    expect(inquiryNumber).toMatch(/^INQ-\d{8}-[A-F0-9]{8}$/)
    await expect(page.getByText("Mixed Summer Clothing Ready Stock Lot")).toBeVisible()
    await expect(page.getByRole("link", { name: "Continue on WhatsApp" })).toHaveAttribute(
      "href",
      new RegExp(`967700000000.*${inquiryNumber}`),
    )
    expect(page.url()).not.toContain("Browser")
    expect(page.url()).not.toContain("700000000")
  })

  test("Arabic inquiry page is fully RTL and client validation is localized", async ({ page }) => {
    await page.goto("/ar/inquiry")

    await expect(page.locator("html")).toHaveAttribute("lang", "ar")
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
    await expect(page.getByRole("heading", { level: 1, name: "أرسل متطلبات الجملة" })).toBeVisible()
    await page.getByRole("button", { name: "إرسال الاستفسار" }).click()
    await expect(page.getByText("هذا الحقل مطلوب.").first()).toBeVisible()
    await expect(page.getByText("اختر منتجًا واحدًا على الأقل أو اكتب متطلبًا واضحًا.")).toBeVisible()
  })

  test("success receipt prevents inquiry-number enumeration", async ({ page }) => {
    const response = await page.goto("/en/inquiry/success/INQ-20260809-AB12CD34")
    expect(response?.status()).toBe(404)
  })
})

void inquirySecret
