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

  const publicContentSeeds = [
    {
      slug: "why-us",
      pageType: "TRUST",
      translations: {
        en: {
          title: "Evidence before every wholesale commitment",
          summary: "A Quanzhou-based clearance supply desk with documented stock, inspection support, and export preparation through Xiamen Port.",
          body: "## Quanzhou warehouse control\nStock lots are consolidated in Quanzhou so quantities, packaging, condition notes, and loading readiness can be checked before quotation.\n## Inspection and loading proof\nAvailable evidence may include current warehouse media, package counts, video inspection, and loading records. Product pages identify what is verified and what still needs confirmation.\n## Xiamen export route\nConfirmed orders are prepared for export through Xiamen Port with packing, commercial documents, and shipment terms agreed before dispatch.\n## Export preparation records\nOur examples describe documented stock and shipment preparation. They do not claim unnamed customer endorsements or completed transactions without supporting records.\n## Commercial clarity\nReference prices are not final offers. Availability, quantity, quality, payment, inspection, packing, and Incoterms are reconfirmed in a structured inquiry.",
          seoTitle: "Wholesale Clothing Supply Evidence | Harbor Stock",
          seoDescription: "Review Harbor Stock's Quanzhou warehouse controls, inspection evidence, and Xiamen export preparation for wholesale clearance clothing.",
        },
        ar: {
          title: "الأدلة قبل كل التزام تجاري بالجملة",
          summary: "مكتب توريد لملابس التصفية في تشيوانتشو مع توثيق المخزون ودعم الفحص وتجهيز التصدير عبر ميناء شيامن.",
          body: "## ضبط المخزون في مستودع تشيوانتشو\nتُجمع الدفعات في تشيوانتشو حتى يمكن التحقق من الكميات والتغليف وملاحظات الحالة والاستعداد للتحميل قبل عرض السعر.\n## أدلة الفحص والتحميل\nقد تشمل الأدلة المتاحة صوراً حديثة من المستودع وعدد الطرود والفحص بالفيديو وسجلات التحميل. وتوضح صفحة كل منتج ما تم التحقق منه وما يحتاج إلى تأكيد.\n## مسار التصدير عبر شيامن\nتُجهز الطلبات المؤكدة للتصدير عبر ميناء شيامن بعد الاتفاق على التعبئة والمستندات التجارية وشروط الشحن.\n## سجلات تجهيز التصدير\nتعرض أمثلتنا مخزوناً موثقاً وخطوات تجهيز الشحنة، ولا تدّعي تزكية عملاء غير مسمين أو صفقات مكتملة من دون سجلات داعمة.\n## وضوح الشروط التجارية\nالأسعار المرجعية ليست عروضاً نهائية. ويُعاد تأكيد التوفر والكمية والجودة والدفع والفحص والتعبئة وشروط التجارة في طلب سعر منظم.",
          seoTitle: "أدلة توريد ملابس الجملة | هاربور ستوك",
          seoDescription: "تعرف على ضبط مستودع تشيوانتشو وأدلة الفحص وتجهيز التصدير عبر شيامن لملابس التصفية بالجملة.",
        },
      },
    },
    {
      slug: "how-to-buy",
      pageType: "BUYING_GUIDE",
      translations: {
        en: {
          title: "A clear route from stock review to export",
          summary: "Build one product list, confirm commercial details, inspect the goods, and prepare shipment through Xiamen Port.",
          body: "## 1. Build one inquiry list\nAdd ready-stock lots or factory-booking styles to one list. Include destination, target quantity, packing needs, and any inspection questions.\n## 2. Reconfirm availability and terms\nOur trade desk checks current quantity, MOQ, quality notes, reference pricing, production lead time, and the applicable purchase unit before quoting.\n## 3. Agree payment and inspection\nPayment method and schedule are agreed in the quotation. Where available, buyers can request warehouse media, video inspection, or an independent inspection before shipment.\n## 4. Prepare stock and documents\nAfter commercial confirmation, goods are counted, packed, marked, and prepared with the agreed invoice, packing list, and export documents.\n## 5. Load and export through Xiamen\nThe shipment is consolidated from Quanzhou and routed through Xiamen Port under the confirmed trade and transport terms.\n## Before you pay\nUse the inquiry reference for follow-up, verify beneficiary and quotation details, and do not rely on payment instructions that do not match the confirmed trade record.",
          seoTitle: "How to Buy Wholesale Clearance Clothing | Harbor Stock",
          seoDescription: "Follow the Harbor Stock buying process for inquiry, quotation, payment, inspection, packing, documents, and export through Xiamen.",
        },
        ar: {
          title: "مسار واضح من مراجعة المخزون إلى التصدير",
          summary: "أنشئ قائمة منتجات واحدة وأكد التفاصيل التجارية وافحص البضاعة وجهز الشحنة عبر ميناء شيامن.",
          body: "## 1. أنشئ قائمة طلب سعر واحدة\nأضف دفعات المخزون الجاهز أو موديلات الحجز المصنعي إلى قائمة واحدة، واذكر الوجهة والكمية والتعبئة وأسئلة الفحص.\n## 2. أعد تأكيد التوفر والشروط\nيتحقق مكتب التجارة من الكمية الحالية والحد الأدنى والجودة والسعر المرجعي ومدة الإنتاج ووحدة الشراء قبل إصدار عرض السعر.\n## 3. اتفق على الدفع والفحص\nيُتفق على طريقة الدفع وجدوله في عرض السعر. ويمكن طلب صور المستودع أو الفحص بالفيديو أو فحص مستقل قبل الشحن عند توفره.\n## 4. جهز المخزون والمستندات\nبعد التأكيد التجاري تُعد البضاعة وتُعبأ وتوضع عليها العلامات، وتُجهز الفاتورة وقائمة التعبئة ومستندات التصدير المتفق عليها.\n## 5. التحميل والتصدير عبر شيامن\nتُجمع الشحنة من تشيوانتشو وتُصدر عبر ميناء شيامن وفق شروط التجارة والنقل المؤكدة.\n## قبل الدفع\nاستخدم رقم طلب السعر في المتابعة، وتحقق من المستفيد وتفاصيل العرض، ولا تعتمد تعليمات دفع لا تطابق السجل التجاري المؤكد.",
          seoTitle: "طريقة شراء ملابس التصفية بالجملة | هاربور ستوك",
          seoDescription: "اتبع خطوات طلب السعر والدفع والفحص والتعبئة والمستندات والتصدير عبر شيامن مع هاربور ستوك.",
        },
      },
    },
    {
      slug: "contact",
      pageType: "CONTACT",
      translations: {
        en: {
          title: "Send your requirement to the trade desk",
          summary: "The structured inquiry list is the fastest way to share products, quantities, destination, and inspection needs without creating an account.",
          body: "## Structured inquiry\nSelect one or more products and submit one inquiry. The reference number keeps product and follow-up details connected without putting customer data in the URL.\n## WhatsApp follow-up\nAfter a successful submission, the confirmation page offers WhatsApp follow-up only when the official destination is configured. A WhatsApp click is not treated as a submitted or qualified inquiry.\n## Response preparation\nInclude your destination country, expected quantity, preferred purchase unit, packing needs, and inspection questions so the trade desk can prepare a useful response.\n## Privacy\nContact details and requirements are used to prepare the quotation and communicate about that inquiry. No buyer account is created, and customer form contents are not sent to public analytics.",
          seoTitle: "Contact the Wholesale Clothing Trade Desk | Harbor Stock",
          seoDescription: "Send a structured wholesale clothing inquiry for stock, quantity, inspection, packing, and Xiamen export support.",
        },
        ar: {
          title: "أرسل متطلباتك إلى مكتب التجارة",
          summary: "قائمة طلب السعر المنظمة هي أسرع طريقة لإرسال المنتجات والكميات والوجهة واحتياجات الفحص من دون إنشاء حساب.",
          body: "## طلب سعر منظم\nاختر منتجاً واحداً أو أكثر وأرسل طلباً واحداً. يحافظ الرقم المرجعي على ربط المنتجات والمتابعة من دون وضع بيانات العميل في الرابط.\n## المتابعة عبر واتساب\nبعد نجاح الإرسال تعرض صفحة التأكيد متابعة واتساب فقط عند ضبط الوجهة الرسمية. ولا تُعد نقرة واتساب طلب سعر مرسلاً أو مؤهلاً.\n## تجهيز الرد\nاذكر بلد الوجهة والكمية ووحدة الشراء والتعبئة وأسئلة الفحص حتى يستطيع مكتب التجارة إعداد رد مفيد.\n## الخصوصية\nتُستخدم بيانات الاتصال والمتطلبات لإعداد عرض السعر والتواصل بشأن الطلب. لا يُنشأ حساب للمشتري، ولا تُرسل محتويات النموذج إلى التحليلات العامة.",
          seoTitle: "اتصل بمكتب تجارة ملابس الجملة | هاربور ستوك",
          seoDescription: "أرسل طلب سعر منظماً للمخزون والكميات والفحص والتعبئة ودعم التصدير عبر شيامن.",
        },
      },
    },
  ] satisfies Array<{
    slug: string
    pageType: string
    translations: Record<Locale, { title: string; summary: string; body: string; seoTitle: string; seoDescription: string }>
  }>

  for (const contentSeed of publicContentSeeds) {
    const contentPage = await prisma.contentPage.upsert({
      where: { slug: contentSeed.slug },
      update: { pageType: contentSeed.pageType, publishedAt: PUBLISHED_AT, createdById: adminId, updatedById: editorId },
      create: {
        slug: contentSeed.slug,
        pageType: contentSeed.pageType,
        publishedAt: PUBLISHED_AT,
        createdById: adminId,
        updatedById: editorId,
      },
    })
    for (const locale of ["en", "ar"] satisfies Locale[]) {
      const translation = contentSeed.translations[locale]
      await prisma.contentTranslation.upsert({
        where: { contentPageId_locale: { contentPageId: contentPage.id, locale } },
        update: translation,
        create: { contentPageId: contentPage.id, locale, ...translation },
      })
    }
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
      title: "Wholesale clearance clothing for Yemen",
      summary: "Mixed ready-stock lots and practical factory-booking styles prepared with clear quantities, inspection options, and Xiamen export terms.",
      body: "## Buyer priorities\nYemen buyers often need practical mixed assortments, clear package counts, durable packing, and a realistic landed-cost discussion before commitment.\n## Supply route\nGoods are consolidated and checked in Quanzhou, then prepared for export through Xiamen Port under confirmed commercial and transport terms.\n## Export preparation example\nA mixed-lot preparation record can include category composition, package count, warehouse media, condition notes, and a container estimate. It is evidence of preparation, not an unnamed customer endorsement.\n## Frequently asked questions\n### Can I combine categories?\nMixed lots depend on current stock composition. Ask for the latest category and size breakdown.\n### Can I inspect before shipment?\nWhere available, request current media, video inspection, or independent inspection in the inquiry.\n### Are prices final?\nNo. Reference prices and availability are reconfirmed before a quotation is issued.\n## Request a quotation\nAdd the relevant products to one inquiry and include destination, quantity, packing, and inspection requirements.",
      seoTitle: "Wholesale Clearance Clothing for Yemen | Harbor Stock",
      seoDescription: "Source mixed clothing lots and factory-booking styles for Yemen with Quanzhou inspection support and Xiamen export preparation.",
    },
    ar: {
      title: "ملابس تصفية بالجملة للسوق اليمني",
      summary: "دفعات مخزون مختلطة وموديلات حجز مصنعي بكميات واضحة وخيارات فحص وشروط تصدير عبر شيامن.",
      body: "## أولويات المشتري\nيحتاج كثير من المشترين في اليمن إلى تشكيلات عملية وعدد طرود واضح وتعبئة متينة ومناقشة واقعية لتكلفة الوصول قبل الالتزام.\n## مسار التوريد\nتُجمع البضاعة وتُفحص في تشيوانتشو ثم تُجهز للتصدير عبر ميناء شيامن وفق الشروط التجارية وشروط النقل المؤكدة.\n## مثال على تجهيز التصدير\nقد يتضمن سجل تجهيز الدفعة المختلطة توزيع الفئات وعدد الطرود وصور المستودع وملاحظات الحالة وتقدير الحاوية. وهو دليل تجهيز وليس تزكية عميل غير مسمى.\n## الأسئلة الشائعة\n### هل يمكن دمج الفئات؟\nتعتمد الدفعات المختلطة على تكوين المخزون الحالي، فاطلب أحدث توزيع للفئات والمقاسات.\n### هل يمكن الفحص قبل الشحن؟\nعند توفره اطلب صوراً حديثة أو فحصاً بالفيديو أو فحصاً مستقلاً ضمن طلب السعر.\n### هل الأسعار نهائية؟\nلا. يُعاد تأكيد السعر المرجعي والتوفر قبل إصدار عرض السعر.\n## اطلب عرض سعر\nأضف المنتجات المناسبة إلى طلب واحد واذكر الوجهة والكمية والتعبئة ومتطلبات الفحص.",
      seoTitle: "ملابس تصفية بالجملة لليمن | هاربور ستوك",
      seoDescription: "اطلب دفعات ملابس مختلطة وموديلات حجز مصنعي لليمن مع دعم الفحص في تشيوانتشو والتصدير عبر شيامن.",
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

  const additionalMarketSeeds = [
    {
      marketCode: "middle-east",
      sourceTag: "market-middle-east",
      translations: {
        en: {
          title: "Wholesale clearance clothing for the Middle East",
          summary: "Ready-stock lots and factory-booking styles for buyers comparing assortment, inspection evidence, packing, and export terms.",
          body: "## Buyer priorities\nMiddle East buyers often compare consistent quality, size and color suitability, packing presentation, repeatability, and clear commercial documents.\n## Supply route\nStock is consolidated in Quanzhou and prepared for export through Xiamen Port after quantity, condition, packing, and terms are confirmed.\n## Export preparation example\nA preparation record can show package counts, current media, inspection availability, loading readiness, and document requirements. It does not replace buyer verification.\n## Frequently asked questions\n### Are Arabic product details available?\nPublished products appear only when an Arabic translation exists; missing translations are not silently replaced with English.\n### Can I request selected styles and mixed lots together?\nYes. Add both to one inquiry so quantities and packing can be reviewed together.\n### Can terms vary by destination?\nYes. Freight, documents, payment, and destination requirements are confirmed per quotation.\n## Request a quotation\nSend one structured inquiry with the products, destination, quantity, packing, and inspection needs.",
          seoTitle: "Middle East Wholesale Clearance Clothing | Harbor Stock",
          seoDescription: "Review wholesale clothing lots and factory-booking styles for Middle East buyers with Quanzhou verification and Xiamen export support.",
        },
        ar: {
          title: "ملابس تصفية بالجملة للشرق الأوسط",
          summary: "دفعات جاهزة وموديلات حجز مصنعي للمشترين الذين يقارنون التشكيلة وأدلة الفحص والتعبئة وشروط التصدير.",
          body: "## أولويات المشتري\nيقارن المشترون في الشرق الأوسط عادة ثبات الجودة وملاءمة المقاسات والألوان وشكل التعبئة وإمكانية التكرار ووضوح المستندات التجارية.\n## مسار التوريد\nيُجمع المخزون في تشيوانتشو ويُجهز للتصدير عبر ميناء شيامن بعد تأكيد الكمية والحالة والتعبئة والشروط.\n## مثال على تجهيز التصدير\nيمكن لسجل التجهيز إظهار عدد الطرود والصور الحالية وإمكانية الفحص والاستعداد للتحميل ومتطلبات المستندات، ولا يحل محل تحقق المشتري.\n## الأسئلة الشائعة\n### هل تتوفر تفاصيل المنتجات بالعربية؟\nلا يظهر المنتج المنشور إلا عند وجود ترجمة عربية، ولا تُستبدل الترجمة المفقودة بالإنجليزية تلقائياً.\n### هل يمكن جمع الموديلات والدفعات المختلطة؟\nنعم. أضفها إلى طلب واحد لمراجعة الكميات والتعبئة معاً.\n### هل تختلف الشروط حسب الوجهة؟\nنعم. يُعاد تأكيد الشحن والمستندات والدفع ومتطلبات الوجهة في كل عرض سعر.\n## اطلب عرض سعر\nأرسل طلباً منظماً بالمنتجات والوجهة والكمية والتعبئة واحتياجات الفحص.",
          seoTitle: "ملابس تصفية بالجملة للشرق الأوسط | هاربور ستوك",
          seoDescription: "راجع دفعات وموديلات ملابس الجملة للشرق الأوسط مع التحقق في تشيوانتشو ودعم التصدير عبر شيامن.",
        },
      },
    },
    {
      marketCode: "india",
      sourceTag: "market-india",
      translations: {
        en: {
          title: "Wholesale clearance clothing for India",
          summary: "Practical stock lots and defined styles with transparent MOQ, composition, inspection, and packing information.",
          body: "## Buyer priorities\nIndia buyers commonly assess price basis, MOQ, fabric or category composition, size ratios, labeling, packing density, and consistency across the lot.\n## Supply route\nGoods are verified and consolidated in Quanzhou, with export preparation and agreed documents routed through Xiamen Port.\n## Export preparation example\nFor a style or mixed lot, the preparation record may include composition, carton or package count, reference price basis, inspection notes, and loading estimates.\n## Frequently asked questions\n### Are prices per piece or per lot?\nEach product states its available price basis; contact-quote products receive commercial terms only after reconfirmation.\n### Can I specify labeling and packing?\nInclude labeling, carton, bale, or assortment requirements in the inquiry for feasibility and cost review.\n### Is factory booking the same as ready stock?\nNo. Factory booking has a production lead time and confirmed specifications; ready stock is checked against current warehouse quantity.\n## Request a quotation\nCombine the relevant products and send destination, quantity, price basis, packing, and inspection requirements.",
          seoTitle: "India Wholesale Clearance Clothing | Harbor Stock",
          seoDescription: "Source clothing stock lots and factory-booking styles for India with clear MOQ, inspection, packing, and Xiamen export terms.",
        },
        ar: {
          title: "ملابس تصفية بالجملة للسوق الهندي",
          summary: "دفعات عملية وموديلات محددة مع معلومات واضحة عن الحد الأدنى والتكوين والفحص والتعبئة.",
          body: "## أولويات المشتري\nيراجع المشترون في الهند أساس السعر والحد الأدنى وتكوين القماش أو الفئات ونسب المقاسات والملصقات وكثافة التعبئة وثبات الدفعة.\n## مسار التوريد\nتُفحص البضاعة وتُجمع في تشيوانتشو، ثم تُجهز مع المستندات المتفق عليها للتصدير عبر ميناء شيامن.\n## مثال على تجهيز التصدير\nقد يتضمن سجل الموديل أو الدفعة التكوين وعدد الكراتين أو الطرود وأساس السعر وملاحظات الفحص وتقدير التحميل.\n## الأسئلة الشائعة\n### هل السعر للقطعة أم للدفعة؟\nتوضح صفحة المنتج أساس السعر المتاح، أما المنتجات التي تتطلب التواصل فتُحدد شروطها بعد إعادة التأكيد.\n### هل يمكن تحديد الملصقات والتعبئة؟\nاذكر متطلبات الملصقات والكراتين أو البالات أو التشكيلة في الطلب لمراجعة الإمكانية والتكلفة.\n### هل الحجز المصنعي مثل المخزون الجاهز؟\nلا. للحجز المصنعي مدة إنتاج ومواصفات مؤكدة، أما المخزون الجاهز فيُراجع حسب الكمية الحالية في المستودع.\n## اطلب عرض سعر\nاجمع المنتجات المناسبة وأرسل الوجهة والكمية وأساس السعر والتعبئة ومتطلبات الفحص.",
          seoTitle: "ملابس تصفية بالجملة للهند | هاربور ستوك",
          seoDescription: "اطلب دفعات وموديلات ملابس للهند مع حد أدنى واضح وفحص وتعبئة وشروط تصدير عبر شيامن.",
        },
      },
    },
    {
      marketCode: "central-asia",
      sourceTag: "market-central-asia",
      translations: {
        en: {
          title: "Wholesale clearance clothing for Central Asia",
          summary: "Season-aware lots and styles with packing, quantity, inspection, and onward-transport details prepared for review.",
          body: "## Buyer priorities\nCentral Asia buyers often focus on season, warmth, size range, durable packing, lot consistency, and transport planning beyond the seaport.\n## Supply route\nStock is consolidated and checked in Quanzhou, exported through Xiamen Port, and quoted with the buyer's onward destination and transport preference recorded.\n## Export preparation example\nA seasonal lot record can include category mix, size range, package count, weight or volume when available, condition evidence, and container estimates.\n## Frequently asked questions\n### Can I filter by season?\nUse the catalog filters and include the destination climate and selling season in the inquiry.\n### Is inland delivery included?\nOnly terms stated in the quotation apply. Share the final destination so transport options can be discussed.\n### Can packing be reinforced?\nState the onward route and packing concern so bale, carton, or marking requirements can be reviewed.\n## Request a quotation\nAdd suitable seasonal products and provide destination, quantity, packing, inspection, and onward-transport needs.",
          seoTitle: "Central Asia Wholesale Clearance Clothing | Harbor Stock",
          seoDescription: "Review seasonal wholesale clothing for Central Asia with Quanzhou checks, Xiamen export preparation, and packing details.",
        },
        ar: {
          title: "ملابس تصفية بالجملة لآسيا الوسطى",
          summary: "دفعات وموديلات مناسبة للمواسم مع تفاصيل التعبئة والكمية والفحص والنقل اللاحق للمراجعة.",
          body: "## أولويات المشتري\nيركز المشترون في آسيا الوسطى عادة على الموسم والدفء ونطاق المقاسات ومتانة التعبئة وثبات الدفعة والتخطيط للنقل بعد الميناء.\n## مسار التوريد\nيُجمع المخزون ويُفحص في تشيوانتشو ويُصدر عبر ميناء شيامن، مع تسجيل الوجهة النهائية وتفضيل النقل في طلب السعر.\n## مثال على تجهيز التصدير\nقد يتضمن سجل الدفعة الموسمية مزيج الفئات ونطاق المقاسات وعدد الطرود والوزن أو الحجم عند توفره وأدلة الحالة وتقدير الحاوية.\n## الأسئلة الشائعة\n### هل يمكن التصفية حسب الموسم؟\nاستخدم فلاتر الكتالوج واذكر مناخ الوجهة وموسم البيع في الطلب.\n### هل يشمل السعر النقل الداخلي؟\nتطبق فقط الشروط المذكورة في عرض السعر. اذكر الوجهة النهائية لمناقشة خيارات النقل.\n### هل يمكن تقوية التعبئة؟\nاذكر مسار النقل اللاحق ومشكلة التعبئة لمراجعة متطلبات البالات أو الكراتين أو العلامات.\n## اطلب عرض سعر\nأضف المنتجات الموسمية المناسبة واذكر الوجهة والكمية والتعبئة والفحص والنقل اللاحق.",
          seoTitle: "ملابس تصفية بالجملة لآسيا الوسطى | هاربور ستوك",
          seoDescription: "راجع ملابس الجملة الموسمية لآسيا الوسطى مع الفحص في تشيوانتشو وتجهيز التصدير والتعبئة عبر شيامن.",
        },
      },
    },
    {
      marketCode: "south-asia",
      sourceTag: "market-south-asia",
      translations: {
        en: {
          title: "Wholesale clearance clothing for South Asia",
          summary: "Mixed lots and factory styles reviewed around value, climate, assortment, packing, inspection, and shipment readiness.",
          body: "## Buyer priorities\nSouth Asia buyers often balance value, warm-climate suitability, assortment depth, size mix, packing efficiency, and transparent condition notes.\n## Supply route\nGoods are consolidated in Quanzhou and prepared through Xiamen Port after stock, packing, inspection, document, and shipment terms are agreed.\n## Export preparation example\nA mixed summer lot record may show category percentages, size range, package density, warehouse evidence, and a container-loading estimate.\n## Frequently asked questions\n### Can I buy a full mixed lot?\nYes when the product is listed as a stock lot and current availability is reconfirmed.\n### Can I order one factory style?\nFactory-booking products state their MOQ and lead-time information where available.\n### How do I compare packing options?\nAdd your preferred unit and destination constraints to the inquiry so packing implications can be reviewed.\n## Request a quotation\nSend one inquiry containing the preferred lots or styles, destination, quantities, packing, and inspection questions.",
          seoTitle: "South Asia Wholesale Clearance Clothing | Harbor Stock",
          seoDescription: "Source mixed lots and factory styles for South Asia with transparent condition, packing, inspection, and Xiamen export preparation.",
        },
        ar: {
          title: "ملابس تصفية بالجملة لجنوب آسيا",
          summary: "دفعات مختلطة وموديلات مصنع تُراجع من حيث القيمة والمناخ والتشكيلة والتعبئة والفحص والاستعداد للشحن.",
          body: "## أولويات المشتري\nيوازن المشترون في جنوب آسيا عادة بين القيمة وملاءمة المناخ الدافئ وعمق التشكيلة ومزيج المقاسات وكفاءة التعبئة ووضوح ملاحظات الحالة.\n## مسار التوريد\nتُجمع البضاعة في تشيوانتشو وتُجهز عبر ميناء شيامن بعد الاتفاق على المخزون والتعبئة والفحص والمستندات وشروط الشحن.\n## مثال على تجهيز التصدير\nقد يعرض سجل دفعة صيفية مختلطة نسب الفئات ونطاق المقاسات وكثافة التعبئة وأدلة المستودع وتقدير تحميل الحاوية.\n## الأسئلة الشائعة\n### هل يمكن شراء دفعة مختلطة كاملة؟\nنعم عندما يكون المنتج مدرجاً كدفعة مخزون وبعد إعادة تأكيد التوفر الحالي.\n### هل يمكن طلب موديل مصنع واحد؟\nتوضح منتجات الحجز المصنعي الحد الأدنى ومدة الإنتاج عند توفرهما.\n### كيف أقارن خيارات التعبئة؟\nأضف وحدة الشراء والقيود في الوجهة إلى الطلب لمراجعة أثر التعبئة.\n## اطلب عرض سعر\nأرسل طلباً واحداً بالدفعات أو الموديلات والوجهة والكميات والتعبئة وأسئلة الفحص.",
          seoTitle: "ملابس تصفية بالجملة لجنوب آسيا | هاربور ستوك",
          seoDescription: "اطلب دفعات مختلطة وموديلات مصنع لجنوب آسيا مع وضوح الحالة والتعبئة والفحص والتجهيز عبر شيامن.",
        },
      },
    },
  ] satisfies Array<{
    marketCode: string
    sourceTag: string
    translations: Record<Locale, { title: string; summary: string; body: string; seoTitle: string; seoDescription: string }>
  }>

  for (const marketSeed of additionalMarketSeeds) {
    const contentPage = await prisma.contentPage.upsert({
      where: { slug: `markets/${marketSeed.marketCode}` },
      update: { pageType: "MARKET", publishedAt: PUBLISHED_AT, createdById: adminId, updatedById: editorId },
      create: {
        slug: `markets/${marketSeed.marketCode}`,
        pageType: "MARKET",
        publishedAt: PUBLISHED_AT,
        createdById: adminId,
        updatedById: editorId,
      },
    })
    for (const locale of ["en", "ar"] satisfies Locale[]) {
      const translation = marketSeed.translations[locale]
      await prisma.contentTranslation.upsert({
        where: { contentPageId_locale: { contentPageId: contentPage.id, locale } },
        update: translation,
        create: { contentPageId: contentPage.id, locale, ...translation },
      })
    }
    const additionalMarket = await prisma.marketPage.upsert({
      where: { marketCode: marketSeed.marketCode },
      update: { contentPageId: contentPage.id, sourceTag: marketSeed.sourceTag },
      create: { contentPageId: contentPage.id, marketCode: marketSeed.marketCode, sourceTag: marketSeed.sourceTag },
    })
    for (const [sortOrder, productId] of [readyStockId, factoryBookingId, soldOutId].entries()) {
      await prisma.marketProduct.upsert({
        where: { marketPageId_productId: { marketPageId: additionalMarket.id, productId } },
        update: { sortOrder, featured: sortOrder < 2 },
        create: { marketPageId: additionalMarket.id, productId, sortOrder, featured: sortOrder < 2 },
      })
    }
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
