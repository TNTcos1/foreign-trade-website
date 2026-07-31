# 海外服装处理货展示与询价网站实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个面向中东、也门、印度和中南亚批发客户的英语 / 阿拉伯语服装处理货展示与询价网站，以多商品询价清单为主转化入口，并提供轻量商品与线索后台。

**Architecture:** 使用 Next.js App Router 的模块化单体应用。公开前台采用服务端渲染以支持双语 SEO，客户端只负责询价清单、筛选交互和表单体验；后台通过受保护的管理路由维护商品、内容和销售线索。PostgreSQL 保存结构化数据，Prisma 提供类型安全访问，媒体使用 S3 兼容对象存储，开发环境用 Docker Compose 启动 PostgreSQL，同时保留本机 PostgreSQL 修复任务。

**Tech Stack:** Next.js 15+、React 19+、TypeScript 5+、Tailwind CSS、PostgreSQL 18、Prisma、Zod、Vitest、Playwright、Docker Compose、S3 兼容对象存储、邮件通知服务、翻译服务、匿名访问分析。

## Global Constraints

- 首发市场：中东、也门、印度、中南亚。
- 首发语言：英语、阿拉伯语；阿拉伯语必须完整支持 RTL，不只是翻译文字。
- 发货信息：泉州集货，经厦门港出口。
- 前台完全免登录；不实现客户账户、会员等级或登录后价格。
- 多商品询价清单是主入口；商品页 WhatsApp 是次入口，提交成功页 WhatsApp 是主要跟进入口。
- 网站不实现在线支付、订单、合同、发票、物流追踪、供应商入驻、自动运费、ERP 实时同步、完整 CRM 或聊天机器人。
- 首页采用货源优先型；商品详情采用真实货况与图片优先型。
- 视觉采用可信贸易风：深绿、沙色 / 暖白、陶土色；不使用无关模特图库替代真实货物内容。
- 商品必须支持整批货 / 混合杂款与单款库存 / 工厂预订两套模板。
- 商品状态必须支持草稿、现货、工厂预订、已售罄和已归档；显示最后核实日期，超期只提醒复核，不自动下架。
- 整批货默认显示联系询价；单款显示 USD 参考单价或区间；最终价格由业务员确认。
- 英文人工录入，阿拉伯语自动生成初稿并在发布前人工校正；数字、币种、MOQ 和交期不得由翻译模型改写。
- 有效询盘必须有可联系的 WhatsApp 号码，并至少选择一个商品或填写明确采购需求。
- WhatsApp 点击不等于已发送消息；系统分别统计点击和业务员确认的有效对话。
- 所有公开表单必须服务端校验、限流和防机器人；后台客户联系方式只能授权用户访问。
- 使用 `C:\Users\25594\Desktop\project\outside` 的本地 Git 仓库与隔离 worktree；按任务创建本地提交，不配置或推送远程。

---

## 实施前环境决策

### 数据库开发环境

- 默认使用 Docker Compose PostgreSQL，映射宿主机 `5433:5432`，避免和本机 PostgreSQL 5432 冲突。
- 本机 PostgreSQL 安装失败根因已确认：PostgreSQL 18.4 的 `postgres.exe` 稳定在旧 `MSVCP140.dll 14.00.24215.1` 中以 `0xC0000005` 崩溃；更新 Microsoft Visual C++ x64 Redistributable 到 `14.51.36247.0` 后，独立 `initdb` 测试已退出码 0。计划中保留“补完本机服务注册”的环境任务，但应用开发不依赖它。
- Docker Desktop 目前客户端可用但 Linux engine 未运行。开始 Task 1 前，用户需启动 Docker Desktop；如果 Docker engine 仍不可用，先执行本机服务注册环境任务或暂停编码，不改用 SQLite，因为生产数据模型要求 PostgreSQL。

## 文件结构总览

第一阶段建立以下职责边界，后续任务不得把所有逻辑堆进单个页面或路由文件：

- `src/app/[locale]/(public)/`：公开双语页面、布局和 SEO。
- `src/app/admin/`：受保护后台页面。
- `src/app/api/`：表单、后台操作和外部服务边界；每个资源独立路由。
- `src/modules/catalog/`：商品领域类型、校验、查询和状态规则。
- `src/modules/inquiries/`：询价清单、服务端提交、商品快照、去重和线索分配。
- `src/modules/content/`：公司、案例、流程和市场落地页内容。
- `src/modules/localization/`：语言路由、RTL、字段翻译和术语保护。
- `src/modules/media/`：上传校验、图片变体、视频元数据和对象存储适配。
- `src/modules/analytics/`：匿名事件名、来源参数和转化埋点。
- `src/modules/auth/`：后台会话、角色和权限检查。
- `src/components/`：可复用 UI 与表单组件；领域规则留在 `src/modules`。
- `prisma/schema.prisma`、`prisma/seed.ts`：数据模型和本地演示数据。
- `tests/unit/`、`tests/integration/`、`tests/e2e/`：对应层级测试。
- `docker-compose.yml`、`.env.example`、`README.md`：环境启动和配置说明。

---

### Task 1: 初始化 Next.js 项目与 Docker 数据库

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `tests/smoke/project-starts.test.ts`
- Modify: `docs/superpowers/specs/2026-07-31-clothing-clearance-website-design.md`

**Interfaces:**
- Produces `npm run dev`, `npm run test:unit`, `npm run test:e2e`, `npm run lint`, `npm run typecheck` scripts.
- Produces Docker service `clearance-postgres` on host port `5433`, database `clearance`, user `clearance_app`.
- Produces environment variables `DATABASE_URL`, `DIRECT_DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `STORAGE_*`, `TRANSLATION_*`, `MAIL_*`, `NEXT_PUBLIC_ANALYTICS_*`.

- [ ] **Step 1: Write the failing smoke test**

```ts
import { describe, expect, it } from "vitest"

describe("project bootstrap", () => {
  it("exposes the public app contract", async () => {
    const response = await fetch("http://localhost:3000/en")
    expect(response.status).toBe(200)
    expect(await response.text()).toContain("Stock")
  })
})
```

- [ ] **Step 2: Run the smoke test to verify the project is not initialized**

Run: `npm run test:unit -- tests/smoke/project-starts.test.ts`
Expected: FAIL because the Next.js app and test script do not exist.

- [ ] **Step 3: Create the app and scripts**

Use Next.js App Router with strict TypeScript. Configure aliases `@/* -> ./src/*`, Vitest with `jsdom`, Playwright with Chromium, and scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

Create a minimal `/en` page containing an accessible `Stock` heading and a placeholder link to the catalog. Do not build feature UI in this task.

- [ ] **Step 4: Add Docker Compose PostgreSQL**

```yaml
services:
  postgres:
    image: postgres:18
    container_name: clearance-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: clearance
      POSTGRES_USER: clearance_app
      POSTGRES_PASSWORD: local-development-only
    ports:
      - "5433:5432"
    volumes:
      - clearance-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U clearance_app -d clearance"]
      interval: 5s
      timeout: 5s
      retries: 12
volumes:
  clearance-postgres-data:
```

Use `postgresql://clearance_app:local-development-only@localhost:5433/clearance` in `.env.example`; never commit real credentials.

- [ ] **Step 5: Run the smallest verification**

Run:

```bash
docker compose up -d postgres
docker compose ps
npm install
npm run dev
npm run test:unit -- tests/smoke/project-starts.test.ts
npm run typecheck
npm run lint
```

Expected: PostgreSQL is healthy, `/en` returns 200, smoke test passes, typecheck and lint pass.

- [ ] **Step 6: Commit**

Do not commit unless the user explicitly asks for a commit. If commits are later requested, commit only the initialization files with `feat: initialize clearance catalog application`.

---

### Task 2: Define Prisma schema, migrations, seed data, and domain types

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/prisma.ts`
- Create: `src/modules/catalog/domain.ts`
- Create: `src/modules/inquiries/domain.ts`
- Create: `tests/unit/catalog-domain.test.ts`
- Create: `tests/integration/database-smoke.test.ts`
- Create: `prisma/migrations/20260731_initial/migration.sql`

**Interfaces:**
- Produces Prisma models `Product`, `ProductTranslation`, `ProductMedia`, `StockLotDetails`, `SingleStyleDetails`, `ProductVariant`, `Inquiry`, `InquiryItem`, `InquiryEvent`, `LeadAssignment`, `ContentPage`, `ContentTranslation`, `MarketPage`, `MarketProduct`, `AdminUser`, `TermTranslation`, `SourceVisit`, and `NotificationAttempt`.
- Produces enums `Locale = en | ar`, `ProductType = STOCK_LOT | SINGLE_STYLE`, `ProductStatus = DRAFT | READY_STOCK | FACTORY_BOOKING | SOLD_OUT | ARCHIVED`, `UserRole = ADMIN | EDITOR | SALES`, `LeadStatus = NEW | CONTACTED | QUALIFIED | QUOTED | WON | LOST`.
- Produces pure functions `canDisplayPublicProduct(status)`, `canAddToInquiry(status)`, `formatPriceVisibility(product)`, and `isEffectiveInquiry(input)`.

- [ ] **Step 1: Write failing domain tests**

```ts
import { describe, expect, it } from "vitest"
import { canAddToInquiry, canDisplayPublicProduct, isEffectiveInquiry } from "@/modules/catalog/domain"

describe("catalog rules", () => {
  it("allows ready and booking products in public inquiry", () => {
    expect(canDisplayPublicProduct("READY_STOCK")).toBe(true)
    expect(canDisplayPublicProduct("FACTORY_BOOKING")).toBe(true)
    expect(canAddToInquiry("SOLD_OUT")).toBe(false)
  })

  it("requires WhatsApp and a product or clear requirement", () => {
    expect(isEffectiveInquiry({ whatsapp: "+967700000000", itemCount: 1, requirement: "" })).toBe(true)
    expect(isEffectiveInquiry({ whatsapp: "+967700000000", itemCount: 0, requirement: "mixed summer clothing, 5000 pcs" })).toBe(true)
    expect(isEffectiveInquiry({ whatsapp: "", itemCount: 1, requirement: "" })).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test:unit -- tests/unit/catalog-domain.test.ts`
Expected: FAIL because domain functions and Prisma schema do not exist.

- [ ] **Step 3: Define the schema and indexes**

Use normalized shared product fields plus one-to-one detail tables for stock lots and single styles. Store bilingual free text in translation rows keyed by `(productId, locale)`. Store inquiry item snapshots as JSON columns with an explicit TypeScript shape containing `productId`, `productCode`, `title`, `productType`, `status`, `referencePrice`, `availableQuantity`, and `lastVerifiedAt`.

Add indexes for `Product(status, publishedAt)`, `Product(type, status)`, `Product(lastVerifiedAt)`, `Inquiry(status, createdAt)`, `Inquiry(assignedToId, status)`, and `SourceVisit(sessionId, createdAt)`. Use database-level unique constraints for product code, inquiry number, and translation locale pairs.

- [ ] **Step 4: Implement domain functions**

```ts
export type InquiryValidityInput = {
  whatsapp: string
  itemCount: number
  requirement: string
}

export function canDisplayPublicProduct(status: ProductStatus): boolean {
  return status === "READY_STOCK" || status === "FACTORY_BOOKING" || status === "SOLD_OUT"
}

export function canAddToInquiry(status: ProductStatus): boolean {
  return status === "READY_STOCK" || status === "FACTORY_BOOKING"
}

export function isEffectiveInquiry(input: InquiryValidityInput): boolean {
  return input.whatsapp.trim().length > 0 && (input.itemCount > 0 || input.requirement.trim().length > 0)
}
```

- [ ] **Step 5: Add seed data**

Seed one ready stock lot, one factory booking single style, one sold-out product, English and Arabic translations, product media metadata, one admin, one editor, one sales user, one published company page, one market page, and source-channel examples. Use clearly fake local credentials and mark them as development-only.

- [ ] **Step 6: Run database verification**

Run:

```bash
docker compose up -d postgres
npx prisma migrate dev --name initial
npx prisma db seed
npm run test:unit -- tests/unit/catalog-domain.test.ts
npm run test:integration -- tests/integration/database-smoke.test.ts
```

Expected: migration applies, seed is idempotent, the database contains both product templates and all three public states, tests pass.

- [ ] **Step 7: Commit**

Do not commit unless explicitly requested. If requested, commit schema, migration, seed, domain files and tests with `feat: add catalog and inquiry data model`.

---

### Task 3: Build localization, public layout, and visual system

**Files:**
- Create: `src/modules/localization/config.ts`
- Create: `src/modules/localization/dictionary.ts`
- Create: `src/modules/localization/format.ts`
- Create: `src/app/[locale]/layout.tsx`
- Create: `src/app/[locale]/(public)/layout.tsx`
- Create: `src/app/[locale]/(public)/loading.tsx`
- Create: `src/components/public/site-header.tsx`
- Create: `src/components/public/site-footer.tsx`
- Create: `src/components/public/locale-switcher.tsx`
- Create: `src/components/ui/status-badge.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/unit/localization.test.ts`
- Create: `tests/e2e/localization.spec.ts`

**Interfaces:**
- Produces `supportedLocales = ["en", "ar"]`, `defaultLocale = "en"`, `isRtlLocale(locale)`, `getDictionary(locale)`, `localizePath(locale, pathname)`, and `formatProductField(product, locale)`.
- The root layout sets `<html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>`.

- [ ] **Step 1: Write failing localization tests**

```ts
import { describe, expect, it } from "vitest"
import { isRtlLocale, localizePath } from "@/modules/localization/config"

describe("localization", () => {
  it("uses RTL only for Arabic", () => {
    expect(isRtlLocale("ar")).toBe(true)
    expect(isRtlLocale("en")).toBe(false)
  })

  it("preserves the page when switching locale", () => {
    expect(localizePath("ar", "/en/products/lot-1001")).toBe("/ar/products/lot-1001")
  })
})
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm run test:unit -- tests/unit/localization.test.ts`
Expected: FAIL because localization modules do not exist.

- [ ] **Step 3: Implement locale configuration and dictionary**

Reject unsupported locale segments with a bilingual 404 response. Keep dictionaries for navigation, statuses, inquiry labels, trade information, validation errors, and accessibility labels. Product content is loaded from translation rows and must not be hard-coded into the dictionary.

- [ ] **Step 4: Implement layout and visual tokens**

Add CSS variables for deep green, sand, warm white, terracotta, readable borders, focus rings and status colors. Build responsive layouts with mobile-first CSS. Use logical properties (`margin-inline`, `padding-inline`, `inset-inline-start`) so RTL does not require duplicated styles. Do not use auto-generated gradients or unrelated stock imagery in production UI.

- [ ] **Step 5: Implement header and locale switcher**

The switcher changes only the locale segment while preserving the current page slug and query source parameters. Header contains catalog, stock lot, single style, trust center, how to buy, contact, and inquiry-list count.

- [ ] **Step 6: Verify in browser and tests**

Run:

```bash
npm run test:unit -- tests/unit/localization.test.ts
npm run test:e2e -- tests/e2e/localization.spec.ts
npm run typecheck
npm run lint
```

Use the browser to verify `/en`, `/ar`, mobile layout, direction, navigation focus states, locale switching, and the persistent inquiry-list entry point.

- [ ] **Step 7: Commit**

Do not commit unless explicitly requested. If requested, use `feat: add bilingual public layout and visual system`.

---

### Task 4: Implement product queries, catalog pages, and detail pages

**Files:**
- Create: `src/modules/catalog/repository.ts`
- Create: `src/modules/catalog/queries.ts`
- Create: `src/modules/catalog/filters.ts`
- Create: `src/components/catalog/product-card.tsx`
- Create: `src/components/catalog/catalog-filters.tsx`
- Create: `src/components/catalog/product-gallery.tsx`
- Create: `src/components/catalog/product-facts.tsx`
- Create: `src/components/catalog/inquiry-actions.tsx`
- Create: `src/app/[locale]/(public)/page.tsx`
- Create: `src/app/[locale]/(public)/stock/page.tsx`
- Create: `src/app/[locale]/(public)/stock-lots/page.tsx`
- Create: `src/app/[locale]/(public)/single-styles/page.tsx`
- Create: `src/app/[locale]/(public)/products/[code]/page.tsx`
- Create: `src/app/[locale]/(public)/products/[code]/not-found.tsx`
- Create: `src/app/[locale]/(public)/products/[code]/loading.tsx`
- Create: `tests/unit/catalog-filters.test.ts`
- Create: `tests/integration/catalog-queries.test.ts`
- Create: `tests/e2e/catalog-browse.spec.ts`

**Interfaces:**
- `parseCatalogFilters(searchParams): CatalogFilters` accepts type, status, category, genderAge, season, purchaseUnit, minMoq, maxMoq, minPrice, maxPrice, sort, and page.
- `listPublicProducts(filters, locale): Promise<PaginatedProductCard[]>` excludes archived and drafts, includes sold-out for SEO but marks it unavailable.
- `getPublicProductByCode(code, locale): Promise<PublicProduct | null>` loads translated content, details, variants, media, and related products.
- `createProductJsonLd(product, locale)` returns a safe structured-data object without inventing price for contact-quote products.

- [ ] **Step 1: Write failing filter and query tests**

```ts
import { describe, expect, it } from "vitest"
import { parseCatalogFilters } from "@/modules/catalog/filters"

describe("catalog filters", () => {
  it("parses supported filter values and ignores unsupported values", () => {
    expect(parseCatalogFilters({ type: "STOCK_LOT", status: "READY_STOCK", page: "2" })).toEqual({
      type: "STOCK_LOT", status: "READY_STOCK", page: 2, sort: "LATEST"
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm run test:unit -- tests/unit/catalog-filters.test.ts`
Expected: FAIL because filter parsing and repository modules do not exist.

- [ ] **Step 3: Implement safe filter parsing and repository queries**

Whitelist enum parameters, clamp page size to 24, normalize search text, and ignore unknown values. Query public statuses only. For product cards include code, translated title, type, status, primary image, quantity summary, reference price display and `canAddToInquiry`.

- [ ] **Step 4: Build homepage and catalog UI**

Homepage order: company positioning and Quanzhou / Xiamen shipping, latest ready stock and factory booking, trust benefits, stock lot / single style entries, warehouse / loading proof, shipment cases, markets, buying process, inquiry list CTA. Catalog supports desktop filter sidebar and mobile drawer, search, sort and pagination.

- [ ] **Step 5: Build detail page**

The first visual block is real media and condition proof. Then show status, last verified date, quantity / package / purchase units / MOQ, quality and treatment reason, price or contact quote, shipping origin and lead time. Render “Add to inquiry list” as primary and WhatsApp as secondary. Sold-out pages remain viewable but cannot be added and show related products.

- [ ] **Step 6: Add metadata and structured data**

Generate localized title, description, canonical URL, language alternates, Open Graph image, sitemap entries and robots behavior. Prevent faceted filter URLs from becoming duplicate index pages. Product JSON-LD must omit `offers.price` when the product is quote-only.

- [ ] **Step 7: Run tests and browser verification**

Run:

```bash
npm run test:unit -- tests/unit/catalog-filters.test.ts
npm run test:integration -- tests/integration/catalog-queries.test.ts
npm run test:e2e -- tests/e2e/catalog-browse.spec.ts
npm run typecheck
npm run lint
```

Use the browser to verify English and Arabic pages, RTL detail layout, real-media-first hierarchy, mobile filters, sold-out behavior, primary inquiry CTA and shareable localized URLs.

- [ ] **Step 8: Commit**

Do not commit unless explicitly requested. If requested, use `feat: add public catalog and product pages`.

---

### Task 5: Implement browser inquiry list and submission form

**Files:**
- Create: `src/modules/inquiries/storage.ts`
- Create: `src/modules/inquiries/validation.ts`
- Create: `src/modules/inquiries/service.ts`
- Create: `src/components/inquiries/inquiry-list-provider.tsx`
- Create: `src/components/inquiries/inquiry-list-drawer.tsx`
- Create: `src/components/inquiries/inquiry-list-summary.tsx`
- Create: `src/components/inquiries/inquiry-form.tsx`
- Create: `src/components/inquiries/submission-success.tsx`
- Create: `src/app/[locale]/(public)/inquiry/page.tsx`
- Create: `src/app/[locale]/(public)/inquiry/success/[number]/page.tsx`
- Create: `src/app/api/inquiries/route.ts`
- Create: `tests/unit/inquiry-storage.test.ts`
- Create: `tests/unit/inquiry-validation.test.ts`
- Create: `tests/integration/inquiry-submission.test.ts`
- Create: `tests/e2e/inquiry-flow.spec.ts`

**Interfaces:**
- `InquiryListItem = { productId: string; code: string; locale: Locale; quantity?: number; note?: string }`.
- `InquiryListStorage` exposes `getItems()`, `addItem(item)`, `updateItem(productId, patch)`, `removeItem(productId)`, and `clear()`.
- `validateInquiryForm(input)` returns a typed success or field-error result.
- `submitInquiry(input, context): Promise<{ inquiryNumber: string; assignedSalesUserId: string | null }>` performs status revalidation, snapshotting, deduplication and assignment in one transaction.
- `POST /api/inquiries` accepts inquiry form data plus selected product IDs, source context and idempotency key; it returns `{ inquiryNumber, redirectUrl }` or field errors.

- [ ] **Step 1: Write failing storage and validation tests**

```ts
import { describe, expect, it } from "vitest"
import { createInquiryListStorage } from "@/modules/inquiries/storage"
import { validateInquiryForm } from "@/modules/inquiries/validation"

describe("inquiry list", () => {
  it("adds, updates, removes and clears items", () => {
    const storage = createInquiryListStorage({ storage: new Map() })
    storage.addItem({ productId: "p1", code: "LOT-1001", locale: "en" })
    storage.updateItem("p1", { quantity: 500 })
    expect(storage.getItems()[0].quantity).toBe(500)
    storage.removeItem("p1")
    expect(storage.getItems()).toEqual([])
  })
})

describe("inquiry form", () => {
  it("requires name, country, WhatsApp and an item or requirement", () => {
    expect(validateInquiryForm({ name: "Ali", country: "YE", whatsapp: "+967700000000", items: ["p1"], requirement: "" }).success).toBe(true)
    expect(validateInquiryForm({ name: "", country: "", whatsapp: "", items: [], requirement: "" }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:unit -- tests/unit/inquiry-storage.test.ts tests/unit/inquiry-validation.test.ts`
Expected: FAIL because inquiry modules do not exist.

- [ ] **Step 3: Implement local list storage**

Use a versioned localStorage key, guard malformed JSON, cap the number of items, and preserve source parameters separately from product items. The UI must work without login and display a persistent count on desktop and mobile.

- [ ] **Step 4: Implement form validation**

Validate required name, country and WhatsApp fields on both client and server. Normalize trimmed values, enforce a reasonable maximum length for free text, validate item IDs as UUIDs / database IDs according to the selected ORM schema, and require at least one selected item or non-empty requirement.

- [ ] **Step 5: Implement service transaction and API route**

On submission: re-query selected products, reject sold-out / archived / draft items with per-item errors, create one inquiry and its item rows, save product snapshots, save source context, calculate an idempotency fingerprint, assign by language or market round-robin, and enqueue notification attempts. Return the existing inquiry number for a matching recent idempotency key.

- [ ] **Step 6: Build inquiry UI**

Product cards and detail pages use “Add to inquiry list” as primary. The drawer lets visitors continue browsing, update quantity / notes, remove items, and submit. The success page shows inquiry number, selected item summary, expected response message, and a WhatsApp primary CTA containing the inquiry number and item count.

- [ ] **Step 7: Run tests and browser verification**

Run:

```bash
npm run test:unit -- tests/unit/inquiry-storage.test.ts tests/unit/inquiry-validation.test.ts
npm run test:integration -- tests/integration/inquiry-submission.test.ts
npm run test:e2e -- tests/e2e/inquiry-flow.spec.ts
npm run typecheck
npm run lint
```

Use the browser to test add / update / remove / continue browsing, duplicate click, sold-out revalidation, English and Arabic form labels, RTL form, validation errors, weak-network retry, success page and WhatsApp deep link.

- [ ] **Step 8: Commit**

Do not commit unless explicitly requested. If requested, use `feat: add multi-product inquiry flow`.

---

### Task 6: Add content pages, market landing pages, SEO, and source tracking

**Files:**
- Create: `src/modules/content/repository.ts`
- Create: `src/modules/content/queries.ts`
- Create: `src/app/[locale]/(public)/why-us/page.tsx`
- Create: `src/app/[locale]/(public)/how-to-buy/page.tsx`
- Create: `src/app/[locale]/(public)/contact/page.tsx`
- Create: `src/app/[locale]/(public)/markets/[slug]/page.tsx`
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Create: `src/modules/analytics/events.ts`
- Create: `src/modules/analytics/source.ts`
- Create: `src/components/analytics/analytics-provider.tsx`
- Create: `tests/unit/source-tracking.test.ts`
- Create: `tests/e2e/public-content.spec.ts`

**Interfaces:**
- `parseSourceContext(url, referrer): SourceContext` returns channel, campaign, landingPath, firstProductCode, locale and session ID.
- `trackPublicEvent(event): void` accepts only whitelisted anonymous event names.
- `getContentPage(slug, locale): Promise<LocalizedContentPage | null>` and `getMarketPage(slug, locale): Promise<LocalizedMarketPage | null>`.

- [ ] **Step 1: Write failing source tests**

```ts
import { describe, expect, it } from "vitest"
import { parseSourceContext } from "@/modules/analytics/source"

describe("source context", () => {
  it("keeps campaign and landing information without customer data", () => {
    const result = parseSourceContext(
      "https://example.com/en/markets/yemen?utm_source=expo&utm_campaign=card-2026",
      "https://google.com/"
    )
    expect(result.channel).toBe("expo")
    expect(result.campaign).toBe("card-2026")
    expect(result.landingPath).toBe("/en/markets/yemen")
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test:unit -- tests/unit/source-tracking.test.ts`
Expected: FAIL because source parser and event whitelist do not exist.

- [ ] **Step 3: Implement content queries and pages**

Build Why Us, How to Buy and Contact pages from database content translations. Include Quanzhou warehouse, Xiamen port, warehouse / inspection / loading proof, export cases, payment / preparation / document flow, public contact channels and privacy notice. Market pages for `middle-east`, `yemen`, `india`, and `south-asia` contain localized introductions, buyer concerns, selected products, cases, FAQ and inquiry CTA.

- [ ] **Step 4: Implement source tracking**

Persist only anonymous session / channel / campaign / landing / first product / locale context. Whitelist event names: `product_view`, `inquiry_item_added`, `inquiry_opened`, `inquiry_submitted`, `whatsapp_click`, `locale_changed`, `market_page_view`. Do not send WhatsApp numbers or inquiry form contents to analytics.

- [ ] **Step 5: Implement SEO files**

Generate localized metadata, canonical and alternate links, JSON-LD for organization and products, sitemap entries for published products and content, and robots rules that exclude admin routes and uncontrolled faceted filters. Quote-only products omit numeric offers.

- [ ] **Step 6: Run tests and browser verification**

Run:

```bash
npm run test:unit -- tests/unit/source-tracking.test.ts
npm run test:e2e -- tests/e2e/public-content.spec.ts
npm run typecheck
npm run lint
```

Verify English / Arabic content, RTL layout, market page links, QR source query preservation, canonical / alternate metadata, sitemap, robots, no customer data in analytics, and accessible privacy notice.

- [ ] **Step 7: Commit**

Do not commit unless explicitly requested. If requested, use `feat: add trust content, market pages, and SEO tracking`.

---

### Task 7: Build media upload and translation adapters

**Files:**
- Create: `src/modules/media/validation.ts`
- Create: `src/modules/media/storage.ts`
- Create: `src/modules/media/image-variants.ts`
- Create: `src/modules/translation/term-protection.ts`
- Create: `src/modules/translation/provider.ts`
- Create: `src/modules/translation/service.ts`
- Create: `src/app/api/admin/media/presign/route.ts`
- Create: `src/app/api/admin/translation/route.ts`
- Create: `tests/unit/media-validation.test.ts`
- Create: `tests/unit/term-protection.test.ts`
- Create: `tests/integration/media-translation.test.ts`

**Interfaces:**
- `validateUpload(file): UploadValidationResult` checks content type, extension, size and count.
- `createPresignedUpload(input): Promise<{ key: string; uploadUrl: string; publicUrl: string }>`.
- `protectTerms(text, fields): ProtectedTranslationInput` and `restoreTerms(translated): string` preserve numbers, currencies, units, MOQ, lead times and product codes.
- `translateEnglishToArabic(input): Promise<{ text: string; provider: string }>`.

- [ ] **Step 1: Write failing media and term tests**

```ts
import { describe, expect, it } from "vitest"
import { protectTerms, restoreTerms } from "@/modules/translation/term-protection"

describe("translation term protection", () => {
  it("does not allow translation to change commercial numbers", () => {
    const protectedInput = protectTerms("MOQ 1,000 pcs at USD 0.90–1.30, 30–45 days", ["price", "moq", "leadTime"])
    expect(restoreTerms(protectedInput.maskedText.replace("1,000", "999"))).toContain("1,000")
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:unit -- tests/unit/media-validation.test.ts tests/unit/term-protection.test.ts`
Expected: FAIL because adapters do not exist.

- [ ] **Step 3: Implement upload validation and storage abstraction**

Reject unsupported MIME types, mismatched extensions, files over configured byte limits and excessive count. Use random storage keys, never client-provided paths, and presigned uploads. Keep S3 compatible storage behind an interface so local development can use a filesystem adapter only when explicitly configured.

- [ ] **Step 4: Implement image variants**

Generate primary, card, thumbnail and social-share variants in a background-safe service. Keep original metadata, dimensions, alt text and ordering. Do not auto-publish an upload until the media record is associated with a product and approved in preview.

- [ ] **Step 5: Implement translation term protection and provider**

Mask product codes, numbers, currencies, dimensions, units, MOQ and lead-time ranges before external translation. Restore exact original tokens after translation and fail the operation if any protected token is missing or changed. Use a provider interface and a deterministic fake provider in tests.

- [ ] **Step 6: Run integration verification**

Run:

```bash
npm run test:unit -- tests/unit/media-validation.test.ts tests/unit/term-protection.test.ts
npm run test:integration -- tests/integration/media-translation.test.ts
npm run typecheck
npm run lint
```

Expected: invalid uploads reject safely, valid media receives random keys and variants, translation preserves commercial values, provider failure leaves English draft intact.

- [ ] **Step 7: Commit**

Do not commit unless explicitly requested. If requested, use `feat: add media and translation adapters`.

---

### Task 8: Implement admin authentication, roles, and content management

**Files:**
- Create: `src/modules/auth/passwords.ts`
- Create: `src/modules/auth/session.ts`
- Create: `src/modules/auth/permissions.ts`
- Create: `src/middleware.ts`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/products/page.tsx`
- Create: `src/app/admin/products/new/page.tsx`
- Create: `src/app/admin/products/[id]/edit/page.tsx`
- Create: `src/app/admin/content/page.tsx`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/api/admin/auth/login/route.ts`
- Create: `src/app/api/admin/products/route.ts`
- Create: `src/app/api/admin/products/[id]/route.ts`
- Create: `src/app/api/admin/content/route.ts`
- Create: `tests/unit/permissions.test.ts`
- Create: `tests/integration/admin-products.test.ts`
- Create: `tests/e2e/admin-publish.spec.ts`

**Interfaces:**
- `requireSession(request): Promise<AdminSession>`.
- `requireRole(session, roles): void` throws a typed forbidden error.
- `hashPassword(password): Promise<string>`, `verifyPassword(password, hash): Promise<boolean>`.
- Product API accepts discriminated payloads `{ type: "STOCK_LOT", ... } | { type: "SINGLE_STYLE", ... }`.
- Admin product API provides draft, preview, publish, quick update, mark sold out, duplicate, archive and restore operations.

- [ ] **Step 1: Write failing permission tests**

```ts
import { describe, expect, it } from "vitest"
import { can } from "@/modules/auth/permissions"

describe("admin permissions", () => {
  it("keeps settings admin-only and allows sales to update assigned leads", () => {
    expect(can("ADMIN", "settings:update")).toBe(true)
    expect(can("EDITOR", "settings:update")).toBe(false)
    expect(can("SALES", "lead:assigned:update")).toBe(true)
    expect(can("SALES", "lead:any:update")).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test:unit -- tests/unit/permissions.test.ts`
Expected: FAIL because auth and permission modules do not exist.

- [ ] **Step 3: Implement secure session and permission checks**

Use an httpOnly, secure-in-production, same-site session cookie backed by a server-side session record or signed opaque token. Hash passwords with a modern password hash. Apply authorization in route handlers and server actions, not only in the UI. Return generic login failure messages and rate-limit login attempts.

- [ ] **Step 4: Build admin product management**

Create a step-based editor for template selection, English fields, media, translation, preview and publish. Make structured fields explicit; do not allow arbitrary free-form JSON to become public product facts. Add quick actions for quantity, price, status, duplicate and archive.

- [ ] **Step 5: Build content management**

Allow authorized editors to maintain company, trust, buying-process, contact, market and case-study translations. Require English content before Arabic page publication and show RTL preview.

- [ ] **Step 6: Run tests and browser verification**

Run:

```bash
npm run test:unit -- tests/unit/permissions.test.ts
npm run test:integration -- tests/integration/admin-products.test.ts
npm run test:e2e -- tests/e2e/admin-publish.spec.ts
npm run typecheck
npm run lint
```

Use the browser to verify login, role boundaries, product draft / preview / publish, Arabic preview, sold-out action, duplicate, archive, content edit and unauthorized API access.

- [ ] **Step 7: Commit**

Do not commit unless explicitly requested. If requested, use `feat: add admin authentication and content management`.

---

### Task 9: Implement lead pipeline, assignment, notifications, and export

**Files:**
- Create: `src/modules/leads/repository.ts`
- Create: `src/modules/leads/service.ts`
- Create: `src/modules/leads/assignment.ts`
- Create: `src/modules/notifications/mailer.ts`
- Create: `src/modules/notifications/retry.ts`
- Create: `src/app/admin/inquiries/page.tsx`
- Create: `src/app/admin/inquiries/[id]/page.tsx`
- Create: `src/app/api/admin/inquiries/[id]/route.ts`
- Create: `src/app/api/admin/inquiries/export/route.ts`
- Create: `tests/unit/lead-assignment.test.ts`
- Create: `tests/integration/lead-pipeline.test.ts`
- Create: `tests/e2e/lead-follow-up.spec.ts`

**Interfaces:**
- `assignInquiry(input: { inquiryId: string; locale: Locale; market?: string }): Promise<string | null>`.
- `updateLead(input: { inquiryId: string; actor: AdminSession; patch: LeadPatch }): Promise<LeadView>`.
- `exportInquiries(filters, actor): Promise<Uint8Array>`.
- `sendInquiryNotification(inquiryId): Promise<NotificationAttempt>` and `retryFailedNotifications(): Promise<number>`.

- [ ] **Step 1: Write failing assignment tests**

```ts
import { describe, expect, it } from "vitest"
import { chooseAssignee } from "@/modules/leads/assignment"

describe("lead assignment", () => {
  it("round-robins active sales users for a locale and market", () => {
    expect(chooseAssignee([
      { id: "s1", locales: ["en"], markets: ["india"], lastAssignedAt: 1 },
      { id: "s2", locales: ["en"], markets: ["india"], lastAssignedAt: 2 }
    ], { locale: "en", market: "india" }).id).toBe("s1")
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test:unit -- tests/unit/lead-assignment.test.ts`
Expected: FAIL because assignment module does not exist.

- [ ] **Step 3: Implement assignment and lead service**

Match active sales users by locale first, then market, then round-robin by last assignment. If no match exists, leave the assignee null and show it to an admin. Enforce sales users can only read and update assigned inquiries; admins can reassign and edit all.

- [ ] **Step 4: Build pipeline UI**

Provide filterable inquiry list, unread state, response-time warning, assignment, priority, status transitions, internal notes, next follow-up, quote amount / currency and won / lost reason. Keep customer contact data behind authorization.

- [ ] **Step 5: Implement notification retry and CSV export**

Create a notification attempt row before sending. Retry transient mail failures with bounded exponential delay; keep the inquiry successful even if mail fails. CSV must escape formula-like cell values, use stable columns, respect filters and be admin-only.

- [ ] **Step 6: Run tests and browser verification**

Run:

```bash
npm run test:unit -- tests/unit/lead-assignment.test.ts
npm run test:integration -- tests/integration/lead-pipeline.test.ts
npm run test:e2e -- tests/e2e/lead-follow-up.spec.ts
npm run typecheck
npm run lint
```

Verify new inquiry notification, assignment fallback, sales scope, response warning, status changes, notes, CSV content and export denial for editor / sales users.

- [ ] **Step 7: Commit**

Do not commit unless explicitly requested. If requested, use `feat: add inquiry pipeline and sales follow-up`.

---

### Task 10: Add security, privacy, observability, backup, and operational checks

**Files:**
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/csrf.ts`
- Create: `src/lib/safe-redirect.ts`
- Create: `src/app/[locale]/(public)/privacy/page.tsx`
- Create: `src/app/[locale]/(public)/not-found.tsx`
- Create: `src/app/error.tsx`
- Create: `src/app/global-error.tsx`
- Create: `scripts/backup-db.ps1`
- Create: `scripts/check-health.ps1`
- Create: `tests/unit/security-boundaries.test.ts`
- Create: `tests/e2e/security-regressions.spec.ts`
- Modify: `README.md`

**Interfaces:**
- `rateLimit(key, policy): Promise<{ allowed: boolean; retryAfterSeconds: number }>`.
- `assertSameOrigin(request): void`.
- `safeRedirect(path, fallback): string`.
- `GET /api/health` returns `{ status: "ok" | "degraded"; database: boolean; version: string }` without secrets.

- [ ] **Step 1: Write failing security tests**

```ts
import { describe, expect, it } from "vitest"
import { safeRedirect } from "@/lib/safe-redirect"

describe("security boundaries", () => {
  it("does not allow external redirect destinations", () => {
    expect(safeRedirect("https://evil.example", "/en")).toBe("/en")
    expect(safeRedirect("/ar/inquiry", "/en")).toBe("/ar/inquiry")
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test:unit -- tests/unit/security-boundaries.test.ts`
Expected: FAIL because security helpers do not exist.

- [ ] **Step 3: Implement boundary protections**

Add same-origin protection to state-changing admin and inquiry routes, rate limits for login and public inquiry, safe redirect validation, upload boundaries, generic public errors, and no customer fields in logs or analytics. Use secure cookie settings and explicit CSP / security headers where compatible with media and analytics.

- [ ] **Step 4: Add privacy, bilingual 404, and error UI**

Explain collection, purpose, retention, contact, and authorized access in English and Arabic. Error pages preserve the inquiry list where possible and link to latest stock, search and contact. 404 pages do not redirect to unrelated products.

- [ ] **Step 5: Add health, backup, and monitoring checks**

Health endpoint checks database connectivity and reports degraded without leaking connection details. Backup script runs `pg_dump` with a timestamped filename and retention policy; health script checks Docker database, app endpoint, migration state, storage configuration and notification configuration. Document restore drill and environment setup in README.

- [ ] **Step 6: Run security verification**

Run:

```bash
npm run test:unit -- tests/unit/security-boundaries.test.ts
npm run test:e2e -- tests/e2e/security-regressions.spec.ts
npm run typecheck
npm run lint
```

Additionally run an authenticated / unauthenticated route matrix, upload rejection checks, rate-limit checks, CSRF checks, safe redirect checks, CSV formula injection checks and a manual review that logs contain no WhatsApp numbers or inquiry messages.

- [ ] **Step 7: Commit**

Do not commit unless explicitly requested. If requested, use `fix: harden public and admin security boundaries`.

---

### Task 11: Configure production-like deployment and complete acceptance

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.production.yml`
- Create: `.env.production.example`
- Create: `scripts/preflight.ps1`
- Create: `tests/e2e/acceptance.spec.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-31-clothing-clearance-website-design.md`

**Interfaces:**
- `npm run build` produces a production build.
- `GET /api/health` is the deployment readiness check.
- `scripts/preflight.ps1` exits nonzero for missing required environment variables, unavailable database, pending migrations or missing storage / notification configuration.

- [ ] **Step 1: Write failing acceptance cases**

```ts
import { test, expect } from "@playwright/test"

test("buyer can select several offers and submit an inquiry", async ({ page }) => {
  await page.goto("/en/stock")
  await page.getByRole("button", { name: /add to inquiry list/i }).first().click()
  await page.getByRole("link", { name: /inquiry list/i }).click()
  await page.getByLabel(/name/i).fill("Ali Buyer")
  await page.getByLabel(/country/i).selectOption("YE")
  await page.getByLabel(/whatsapp/i).fill("+967700000000")
  await page.getByRole("button", { name: /submit inquiry/i }).click()
  await expect(page.getByText(/inquiry number/i)).toBeVisible()
})
```

- [ ] **Step 2: Run acceptance test to verify missing production flow**

Run: `npm run test:e2e -- tests/e2e/acceptance.spec.ts`
Expected: FAIL until all public, database, inquiry and notification tasks are integrated.

- [ ] **Step 3: Add production image and compose configuration**

Use a non-root application container, a healthcheck, a separate PostgreSQL service or managed PostgreSQL URL, runtime environment variables, migration-on-deploy as an explicit release step, and no secrets in the image. Do not expose PostgreSQL publicly in production compose.

- [ ] **Step 4: Add preflight and runbook**

Preflight verifies Node / Docker versions, required environment values, database reachability, migration status, storage bucket access, mail sender configuration, default admin absence in production, and site URL / locale settings. README documents local Docker, optional repaired Windows PostgreSQL, migrations, seed reset, media storage, email, translation, backup and restore.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
powershell -ExecutionPolicy Bypass -File scripts/preflight.ps1
```

Manually verify Android / iPhone, WhatsApp in-app browser, desktop browsers, English / Arabic content, RTL, real media, public SEO, QR source tracking, inquiry list main CTA, post-submit WhatsApp, admin roles, sold-out handling, notification failure, backup restore, and target-market network conditions.

- [ ] **Step 6: Update readiness status**

Only after all acceptance checks pass, update the design spec status to `实施完成，待上线验收` and list any business-provided content still missing. Do not claim launch readiness while content, notification, backup or restore checks remain unresolved.

- [ ] **Step 7: Commit**

Do not commit unless explicitly requested. If requested after all verification, use `chore: prepare first release deployment`.

---

## Coverage Self-Review

- 双语与 RTL：Task 3、Task 4、Task 6、Task 8、Task 11。
- 首页、目录、详情、状态、价格与真实媒体优先：Task 2、Task 4、Task 7。
- 多商品询价清单主入口、商品快照、重复提交和成功后 WhatsApp：Task 5。
- 线索分配、销售管道、通知、重试、统计和 CSV：Task 2、Task 9。
- 信任中心、市场页、SEO、二维码与来源追踪：Task 6。
- 后台角色、商品发布、翻译预览、售罄、复制和归档：Task 8。
- 安全、隐私、限流、CSRF、上传和日志：Task 7、Task 10。
- 异常处理、健康检查、备份、恢复、部署和验收：Task 5、Task 9、Task 10、Task 11。
- 第一版不包含的支付、账户、供应商、ERP、完整 CRM 和聊天机器人没有出现在实施任务中。
- 计划中没有 `TBD`、`TODO`、`FIXME` 或未定义的跨任务函数；所有跨模块接口在对应任务中声明。
