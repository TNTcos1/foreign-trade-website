import { expect, test } from "@playwright/test"

test("English trust content renders structured evidence and SEO metadata", async ({
  page,
}) => {
  await page.goto("/en/why-us")

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Evidence before every wholesale commitment",
    }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "Quanzhou warehouse control" }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "Inspection and loading proof" }),
  ).toBeVisible()
  await expect(page.locator(".content-section")).toHaveCount(5)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/en\/why-us$/,
  )
  await expect(page.locator('link[hreflang="ar"]')).toHaveAttribute(
    "href",
    /\/ar\/why-us$/,
  )
})

test("Arabic content keeps the route, RTL document, and localized copy", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.addEventListener("harbor-stock:public-event", (event) => {
      const events = JSON.parse(sessionStorage.getItem("public-events") ?? "[]")
      events.push((event as CustomEvent).detail)
      sessionStorage.setItem("public-events", JSON.stringify(events))
    })
  })
  await page.goto("/en/how-to-buy?utm_source=expo")
  await page.getByRole("link", { name: /العربية/ }).click()

  await expect(page).toHaveURL(/\/ar\/how-to-buy\?utm_source=expo$/)
  await expect(page.locator("html")).toHaveAttribute("lang", "ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "مسار واضح من مراجعة المخزون إلى التصدير",
    }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "1. أنشئ قائمة طلب سعر واحدة" }),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(sessionStorage.getItem("public-events") ?? "[]"),
      ),
    )
    .toContainEqual({
      name: "locale_changed",
      locale: "en",
      placement: "locale_switcher",
    })
})

test("market page shows localized stock, propagates source, and emits an anonymous event", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const events: unknown[] = []
    Object.defineProperty(window, "__publicEvents", { value: events })
    window.addEventListener("harbor-stock:public-event", (event) => {
      events.push((event as CustomEvent).detail)
    })
  })

  await page.goto("/en/markets/yemen")

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Wholesale clearance clothing for Yemen",
    }),
  ).toBeVisible()
  await expect(page.locator("main")).toHaveAttribute("data-market-code", "yemen")
  await expect(page.getByTestId("product-card")).toHaveCount(2)
  await expect(
    page.getByRole("heading", { level: 2, name: "Frequently asked questions" }),
  ).toBeVisible()

  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as typeof window & { __publicEvents: unknown[] }).__publicEvents,
      ),
    )
    .toContainEqual({
      name: "market_page_view",
      locale: "en",
      placement: "market_page",
      marketCode: "yemen",
    })

  await page.getByRole("link", { name: "Send this market requirement" }).click()
  await expect(page).toHaveURL(
    /\/en\/inquiry\?market=yemen&channel=market-page$/,
  )
})

test("all configured market pages are published in both languages", async ({
  request,
}) => {
  const marketSlugs = [
    "middle-east",
    "yemen",
    "india",
    "central-asia",
    "south-asia",
  ]

  for (const locale of ["en", "ar"]) {
    for (const slug of marketSlugs) {
      const response = await request.get(`/${locale}/markets/${slug}`)
      expect(response.status(), `${locale}/${slug}`).toBe(200)
    }
  }
})

test("robots and sitemap expose only controlled public discovery routes", async ({
  request,
}) => {
  const robotsResponse = await request.get("/robots.txt")
  expect(robotsResponse.status()).toBe(200)
  const robots = await robotsResponse.text()
  expect(robots).toContain("Disallow: /api/")
  expect(robots).toContain("Disallow: /*/inquiry/success")
  expect(robots).toContain("Disallow: /*/catalog?*")
  expect(robots).toContain("Disallow: /*/stock?*")
  expect(robots).toContain("Sitemap:")

  const sitemapResponse = await request.get("/sitemap.xml")
  expect(sitemapResponse.status()).toBe(200)
  const sitemap = await sitemapResponse.text()
  expect(sitemap).toContain("/en/why-us")
  expect(sitemap).toContain("/en/stock")
  expect(sitemap).toContain("/ar/markets/yemen")
  expect(sitemap).toContain("/en/products/DEV-STOCK-READY-001")
  expect(sitemap).not.toContain("/inquiry/success")
})

test("product detail emits only the anonymous product view payload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const events: unknown[] = []
    Object.defineProperty(window, "__publicEvents", { value: events })
    window.addEventListener("harbor-stock:public-event", (event) => {
      events.push((event as CustomEvent).detail)
    })
  })

  await page.goto("/en/products/DEV-STOCK-READY-001")

  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as typeof window & { __publicEvents: unknown[] }).__publicEvents,
      ),
    )
    .toContainEqual({
      name: "product_view",
      locale: "en",
      placement: "product_detail",
      productCode: "DEV-STOCK-READY-001",
    })
  const events = await page.evaluate(() =>
    (window as typeof window & { __publicEvents: unknown[] }).__publicEvents,
  )
  expect(JSON.stringify(events)).not.toMatch(/whatsapp|requirement|customer/i)
})
