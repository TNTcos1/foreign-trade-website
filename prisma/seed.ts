import { PrismaClient, type Locale, type ProductStatus, type ProductType, type UserRole } from "@prisma/client"
import { hash } from "bcryptjs"
import { getDevelopmentSeedPassword } from "./development-seed-policy"

const prisma = new PrismaClient()
const PUBLISHED_AT = new Date("2026-07-31T08:00:00.000Z")
const LAST_VERIFIED_AT = new Date("2026-07-31T07:30:00.000Z")

const users = [
  { email: "admin@clearance.local.invalid", name: "Development Admin", role: "ADMIN" },
  { email: "editor@clearance.local.invalid", name: "Development Editor", role: "EDITOR" },
  { email: "sales@clearance.local.invalid", name: "Development Sales", role: "SALES" },
] satisfies Array<{ email: string; name: string; role: UserRole }>

const productSeeds = [
  {
    code: "DEV-STOCK-READY-001",
    type: "STOCK_LOT",
    status: "READY_STOCK",
    category: "Mixed summer clothing",
    genderAge: "Adults and children",
    season: "Summer",
    tags: ["development-seed", "mixed-lot", "summer"],
    sourceType: "Export overstock",
    sourceLocation: "Quanzhou, China",
    qualityGrade: "A/B mixed",
    clearanceReason: "Export order overrun",
    defectNotes: "Minor packaging variation only; inspect before shipment.",
    inspectionAvailable: true,
    purchaseUnit: "lot",
    minimumOrderQuantity: 5000,
    tradeTerms: "FOB Xiamen",
    currency: "USD",
    referencePriceMin: "1.20",
    referencePriceMax: "1.55",
    priceBasis: "per piece",
    availableQuantity: 24000,
    translations: {
      en: {
        title: "Mixed Summer Clothing Ready Stock Lot",
        summary: "A 24,000-piece mixed summer apparel lot available for prompt inspection and shipment.",
        description: "Development seed listing for a mixed export-overstock lot stored in Quanzhou, with inspection available before FOB Xiamen shipment.",
        seoTitle: "Mixed Summer Clothing Stock Lot",
        seoDescription: "Ready-stock mixed summer clothing lot for wholesale buyers.",
        shareImageAlt: "Packed mixed summer clothing in a warehouse",
      },
      ar: {
        title: "تشكيلة ملابس صيفية جاهزة بالمخزون",
        summary: "دفعة مختلطة من 24000 قطعة صيفية متاحة للفحص والشحن السريع.",
        description: "قائمة تجريبية لفائض تصدير مختلط مخزن في تشيوانتشو، مع إمكانية الفحص قبل الشحن من ميناء شيامن.",
        seoTitle: "دفعة ملابس صيفية جاهزة",
        seoDescription: "دفعة ملابس صيفية مختلطة جاهزة لمشتري الجملة.",
        shareImageAlt: "طرود ملابس صيفية مختلطة في المستودع",
      },
    },
    media: {
      url: "/seed-media/ready-stock-lot-001.jpg",
      altText: "Development sample of packed ready-stock clothing",
      metadata: { developmentOnly: true, width: 1600, height: 1067, source: "seed-placeholder" },
    },
  },
  {
    code: "DEV-STYLE-BOOKING-001",
    type: "SINGLE_STYLE",
    status: "FACTORY_BOOKING",
    category: "T-shirts",
    genderAge: "Men",
    season: "All season",
    tags: ["development-seed", "single-style", "factory-booking"],
    sourceType: "Factory direct",
    sourceLocation: "Quanzhou, China",
    qualityGrade: "Export standard",
    clearanceReason: null,
    defectNotes: null,
    inspectionAvailable: true,
    purchaseUnit: "piece",
    minimumOrderQuantity: 3000,
    tradeTerms: "FOB Xiamen",
    currency: "USD",
    referencePriceMin: null,
    referencePriceMax: null,
    priceBasis: null,
    availableQuantity: null,
    translations: {
      en: {
        title: "Factory Booking Cotton Crew-Neck T-Shirt",
        summary: "One export-ready style with configurable colors and sizes for factory booking.",
        description: "Development seed listing for a 180 gsm cotton crew-neck T-shirt produced to confirmed color and size quantities.",
        seoTitle: "Factory Booking Cotton T-Shirt",
        seoDescription: "Single-style cotton T-shirt available for wholesale factory booking.",
        shareImageAlt: "Cotton crew-neck T-shirt color samples",
      },
      ar: {
        title: "تيشيرت قطني للحجز المصنعي",
        summary: "موديل واحد جاهز للتصدير مع ألوان ومقاسات قابلة للتخصيص عند الحجز.",
        description: "قائمة تجريبية لتيشيرت قطني بياقة دائرية ووزن 180 غراماً، يُنتج حسب كميات الألوان والمقاسات المؤكدة.",
        seoTitle: "تيشيرت قطني للحجز من المصنع",
        seoDescription: "موديل تيشيرت قطني واحد متاح للحجز المصنعي بالجملة.",
        shareImageAlt: "عينات ألوان لتيشيرت قطني بياقة دائرية",
      },
    },
    media: {
      url: "/seed-media/factory-booking-style-001.jpg",
      altText: "Development sample of a factory-booking T-shirt",
      metadata: { developmentOnly: true, width: 1600, height: 1067, source: "seed-placeholder" },
    },
  },
  {
    code: "DEV-STOCK-SOLD-001",
    type: "STOCK_LOT",
    status: "SOLD_OUT",
    category: "Children's hoodies",
    genderAge: "Children",
    season: "Autumn/Winter",
    tags: ["development-seed", "sold-out", "hoodies"],
    sourceType: "Cancelled export order",
    sourceLocation: "Quanzhou, China",
    qualityGrade: "A grade",
    clearanceReason: "Buyer cancellation",
    defectNotes: null,
    inspectionAvailable: false,
    purchaseUnit: "lot",
    minimumOrderQuantity: 4000,
    tradeTerms: "FOB Xiamen",
    currency: "USD",
    referencePriceMin: "2.80",
    referencePriceMax: "3.10",
    priceBasis: "per piece",
    availableQuantity: 0,
    translations: {
      en: {
        title: "Sold-Out Children's Hoodie Stock Lot",
        summary: "A completed 8,000-piece hoodie lot retained as a sold-out availability example.",
        description: "Development seed listing that demonstrates how unavailable products remain public while inquiry actions are disabled.",
        seoTitle: "Sold-Out Children's Hoodie Lot",
        seoDescription: "Sold-out wholesale children's hoodie stock-lot example.",
        shareImageAlt: "Children's hoodies from a completed stock lot",
      },
      ar: {
        title: "دفعة هوديز أطفال نفدت من المخزون",
        summary: "دفعة مكتملة من 8000 قطعة معروضة كمثال على حالة نفاد المخزون.",
        description: "قائمة تجريبية توضح بقاء المنتجات غير المتاحة ظاهرة للعامة مع تعطيل إجراء طلب السعر.",
        seoTitle: "دفعة هوديز أطفال نفدت",
        seoDescription: "مثال لدفعة هوديز أطفال بالجملة نفدت من المخزون.",
        shareImageAlt: "هوديز أطفال من دفعة مخزون مكتملة",
      },
    },
    media: {
      url: "/seed-media/sold-out-stock-lot-001.jpg",
      altText: "Development sample of a sold-out children's hoodie lot",
      metadata: { developmentOnly: true, width: 1600, height: 1067, source: "seed-placeholder" },
    },
  },
] satisfies Array<{
  code: string
  type: ProductType
  status: ProductStatus
  category: string
  genderAge: string
  season: string
  tags: string[]
  sourceType: string
  sourceLocation: string
  qualityGrade: string
  clearanceReason: string | null
  defectNotes: string | null
  inspectionAvailable: boolean
  purchaseUnit: string
  minimumOrderQuantity: number
  tradeTerms: string
  currency: string
  referencePriceMin: string | null
  referencePriceMax: string | null
  priceBasis: string | null
  availableQuantity: number | null
  translations: Record<Locale, {
    title: string
    summary: string
    description: string
    seoTitle: string
    seoDescription: string
    shareImageAlt: string
  }>
  media: {
    url: string
    altText: string
    metadata: { developmentOnly: boolean; width: number; height: number; source: string }
  }
}>

async function seed() {
  const developmentPassword = getDevelopmentSeedPassword(process.env)
  const developmentPasswordHash = await hash(developmentPassword, 12)
  const seededUsers = new Map<UserRole, string>()

  for (const user of users) {
    const savedUser = await prisma.adminUser.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: developmentPasswordHash,
        role: user.role,
        active: true,
        developmentOnly: true,
      },
      create: {
        ...user,
        passwordHash: developmentPasswordHash,
        active: true,
        developmentOnly: true,
      },
    })
    seededUsers.set(user.role, savedUser.id)
  }

  const adminId = seededUsers.get("ADMIN")!
  const editorId = seededUsers.get("EDITOR")!
  const productsByCode = new Map<string, string>()

  for (const productSeed of productSeeds) {
    const { translations, media, ...productData } = productSeed
    const product = await prisma.product.upsert({
      where: { code: productData.code },
      update: {
        ...productData,
        publishedAt: PUBLISHED_AT,
        lastVerifiedAt: LAST_VERIFIED_AT,
        createdById: adminId,
        updatedById: editorId,
      },
      create: {
        ...productData,
        publishedAt: PUBLISHED_AT,
        lastVerifiedAt: LAST_VERIFIED_AT,
        createdById: adminId,
        updatedById: editorId,
      },
    })
    productsByCode.set(product.code, product.id)

    for (const locale of ["en", "ar"] satisfies Locale[]) {
      await prisma.productTranslation.upsert({
        where: { productId_locale: { productId: product.id, locale } },
        update: translations[locale],
        create: { productId: product.id, locale, ...translations[locale] },
      })
    }

    await prisma.productMedia.upsert({
      where: { productId_sortOrder: { productId: product.id, sortOrder: 0 } },
      update: { ...media, mediaType: "IMAGE", isPrimary: true },
      create: { productId: product.id, ...media, mediaType: "IMAGE", sortOrder: 0, isPrimary: true },
    })
  }

  const readyStockId = productsByCode.get("DEV-STOCK-READY-001")!
  const factoryBookingId = productsByCode.get("DEV-STYLE-BOOKING-001")!
  const soldOutId = productsByCode.get("DEV-STOCK-SOLD-001")!

  await prisma.stockLotDetails.upsert({
    where: { productId: readyStockId },
    update: {
      totalPieces: 24000,
      totalPackages: 240,
      totalWeightKg: "7200.00",
      totalVolumeCbm: "54.000",
      categoryComposition: { tShirts: 45, shorts: 30, dresses: 25 },
      sizeRange: "Children 6-14; Adults S-XXL",
      piecesPerPackage: 100,
      containerLoadEstimate: { fortyFootHighCube: 1 },
    },
    create: {
      productId: readyStockId,
      totalPieces: 24000,
      totalPackages: 240,
      totalWeightKg: "7200.00",
      totalVolumeCbm: "54.000",
      categoryComposition: { tShirts: 45, shorts: 30, dresses: 25 },
      sizeRange: "Children 6-14; Adults S-XXL",
      piecesPerPackage: 100,
      containerLoadEstimate: { fortyFootHighCube: 1 },
    },
  })

  await prisma.singleStyleDetails.upsert({
    where: { productId: factoryBookingId },
    update: {
      styleNumber: "DEV-TS-180",
      fabric: "100% cotton jersey, 180 gsm",
      styleNotes: "Crew neck; buyer confirms colors and size ratio before production.",
      piecesPerCarton: 60,
      factoryLeadTimeDays: 35,
    },
    create: {
      productId: factoryBookingId,
      styleNumber: "DEV-TS-180",
      fabric: "100% cotton jersey, 180 gsm",
      styleNotes: "Crew neck; buyer confirms colors and size ratio before production.",
      piecesPerCarton: 60,
      factoryLeadTimeDays: 35,
    },
  })

  await prisma.productVariant.upsert({
    where: { productId_sku: { productId: factoryBookingId, sku: "DEV-TS-180-BLK-M" } },
    update: { color: "Black", size: "M", availableQuantity: 0 },
    create: {
      productId: factoryBookingId,
      sku: "DEV-TS-180-BLK-M",
      color: "Black",
      size: "M",
      availableQuantity: 0,
    },
  })

  await prisma.stockLotDetails.upsert({
    where: { productId: soldOutId },
    update: {
      totalPieces: 8000,
      totalPackages: 160,
      totalWeightKg: "4000.00",
      totalVolumeCbm: "38.000",
      categoryComposition: { hoodies: 100 },
      sizeRange: "Children 6-14",
      piecesPerPackage: 50,
      containerLoadEstimate: { twentyFoot: 1 },
    },
    create: {
      productId: soldOutId,
      totalPieces: 8000,
      totalPackages: 160,
      totalWeightKg: "4000.00",
      totalVolumeCbm: "38.000",
      categoryComposition: { hoodies: 100 },
      sizeRange: "Children 6-14",
      piecesPerPackage: 50,
      containerLoadEstimate: { twentyFoot: 1 },
    },
  })

  const companyPage = await prisma.contentPage.upsert({
    where: { slug: "company" },
    update: { pageType: "COMPANY", publishedAt: PUBLISHED_AT, createdById: adminId, updatedById: editorId },
    create: {
      slug: "company",
      pageType: "COMPANY",
      publishedAt: PUBLISHED_AT,
      createdById: adminId,
      updatedById: editorId,
    },
  })

  const companyTranslations = {
    en: {
      title: "About the Development Clearance Company",
      summary: "A development-only company profile for the local catalog.",
      body: "We consolidate clothing clearance lots in Quanzhou and prepare export shipments through Xiamen. This content is sample data for local development only.",
      seoTitle: "Development Clearance Company",
      seoDescription: "Local development company-profile seed content.",
    },
    ar: {
      title: "عن شركة التصفية التجريبية",
      summary: "ملف شركة مخصص لبيئة التطوير المحلية فقط.",
      body: "نجمع دفعات تصفية الملابس في تشيوانتشو ونجهز شحنات التصدير عبر شيامن. هذا المحتوى بيانات تجريبية للتطوير المحلي فقط.",
      seoTitle: "شركة التصفية التجريبية",
      seoDescription: "محتوى تجريبي لملف الشركة في بيئة التطوير المحلية.",
    },
  } satisfies Record<Locale, { title: string; summary: string; body: string; seoTitle: string; seoDescription: string }>

  for (const locale of ["en", "ar"] satisfies Locale[]) {
    await prisma.contentTranslation.upsert({
      where: { contentPageId_locale: { contentPageId: companyPage.id, locale } },
      update: companyTranslations[locale],
      create: { contentPageId: companyPage.id, locale, ...companyTranslations[locale] },
    })
  }

  const marketContentPage = await prisma.contentPage.upsert({
    where: { slug: "markets/yemen" },
    update: { pageType: "MARKET", publishedAt: PUBLISHED_AT, createdById: adminId, updatedById: editorId },
    create: {
      slug: "markets/yemen",
      pageType: "MARKET",
      publishedAt: PUBLISHED_AT,
      createdById: adminId,
      updatedById: editorId,
    },
  })

  const marketTranslations = {
    en: {
      title: "Yemen Wholesale Clothing Market",
      summary: "Development seed content for buyers sourcing mixed lots and factory-booked styles.",
      body: "Sample market guidance covering practical quantities, Xiamen shipping, inspection, and WhatsApp inquiry preparation.",
      seoTitle: "Yemen Wholesale Clothing Development Page",
      seoDescription: "Development-only Yemen market seed page.",
    },
    ar: {
      title: "سوق ملابس الجملة في اليمن",
      summary: "محتوى تجريبي للمشترين الباحثين عن الدفعات المختلطة وموديلات الحجز المصنعي.",
      body: "إرشادات سوق تجريبية تشمل الكميات العملية والشحن من شيامن والفحص وتجهيز طلب السعر عبر واتساب.",
      seoTitle: "صفحة تجريبية لسوق الملابس في اليمن",
      seoDescription: "صفحة سوق اليمن مخصصة لبيئة التطوير فقط.",
    },
  } satisfies Record<Locale, { title: string; summary: string; body: string; seoTitle: string; seoDescription: string }>

  for (const locale of ["en", "ar"] satisfies Locale[]) {
    await prisma.contentTranslation.upsert({
      where: { contentPageId_locale: { contentPageId: marketContentPage.id, locale } },
      update: marketTranslations[locale],
      create: { contentPageId: marketContentPage.id, locale, ...marketTranslations[locale] },
    })
  }

  const marketPage = await prisma.marketPage.upsert({
    where: { marketCode: "yemen" },
    update: { contentPageId: marketContentPage.id, sourceTag: "dev-market-yemen" },
    create: { contentPageId: marketContentPage.id, marketCode: "yemen", sourceTag: "dev-market-yemen" },
  })

  for (const [sortOrder, productId] of [readyStockId, factoryBookingId, soldOutId].entries()) {
    await prisma.marketProduct.upsert({
      where: { marketPageId_productId: { marketPageId: marketPage.id, productId } },
      update: { sortOrder, featured: sortOrder < 2 },
      create: { marketPageId: marketPage.id, productId, sortOrder, featured: sortOrder < 2 },
    })
  }

  await prisma.sourceVisit.upsert({
    where: { id: "00000000-0000-4000-8000-000000000101" },
    update: {
      sessionId: "dev-session-whatsapp",
      channel: "WHATSAPP",
      campaign: "dev-ready-stock",
      source: "whatsapp",
      medium: "message",
      landingPage: "/en/products/DEV-STOCK-READY-001",
      firstProductId: readyStockId,
      marketPageId: null,
      referrer: null,
      metadata: { developmentOnly: true, example: "product-deep-link" },
    },
    create: {
      id: "00000000-0000-4000-8000-000000000101",
      sessionId: "dev-session-whatsapp",
      channel: "WHATSAPP",
      campaign: "dev-ready-stock",
      source: "whatsapp",
      medium: "message",
      landingPage: "/en/products/DEV-STOCK-READY-001",
      firstProductId: readyStockId,
      metadata: { developmentOnly: true, example: "product-deep-link" },
    },
  })

  await prisma.sourceVisit.upsert({
    where: { id: "00000000-0000-4000-8000-000000000102" },
    update: {
      sessionId: "dev-session-qr",
      channel: "QR",
      campaign: "dev-yemen-market",
      source: "trade-fair-card",
      medium: "qr",
      landingPage: "/ar/markets/yemen",
      firstProductId: null,
      marketPageId: marketPage.id,
      referrer: null,
      metadata: { developmentOnly: true, example: "market-qr-code" },
    },
    create: {
      id: "00000000-0000-4000-8000-000000000102",
      sessionId: "dev-session-qr",
      channel: "QR",
      campaign: "dev-yemen-market",
      source: "trade-fair-card",
      medium: "qr",
      landingPage: "/ar/markets/yemen",
      marketPageId: marketPage.id,
      metadata: { developmentOnly: true, example: "market-qr-code" },
    },
  })

  const termTranslations = [
    { termKey: "inquiry.requestQuote", locale: "en" as const, value: "Request a quote" },
    { termKey: "inquiry.requestQuote", locale: "ar" as const, value: "اطلب عرض سعر" },
  ]

  for (const term of termTranslations) {
    await prisma.termTranslation.upsert({
      where: { termKey_locale: { termKey: term.termKey, locale: term.locale } },
      update: { value: term.value },
      create: term,
    })
  }

  console.info("Seeded development-only catalog, content, users, and source examples.")
}

seed()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
