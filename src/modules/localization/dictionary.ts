import type { SupportedLocale } from "@/modules/localization/config"

const dictionaries = {
  en: {
    brand: {
      name: "Harbor Stock",
      descriptor: "Wholesale clothing clearance",
    },
    navigation: {
      catalog: "Catalog",
      stockLots: "Stock lots",
      singleStyles: "Single styles",
      trustCenter: "Trust center",
      howToBuy: "How to buy",
      contact: "Contact",
    },
    statuses: {
      readyStock: "Ready stock",
      factoryBooking: "Factory booking",
      soldOut: "Sold out",
      draft: "Draft",
      archived: "Archived",
    },
    inquiry: {
      list: "Inquiry list",
      itemCount: (count: number) =>
        `Inquiry list, ${count} ${count === 1 ? "item" : "items"}`,
      add: "Add to inquiry list",
      selected: "Selected for inquiry",
      empty: "Your inquiry list is empty.",
      review: "Review inquiry list",
    },
    trade: {
      kicker: "Verified clearance supply",
      title: "Stock for serious wholesale buyers.",
      introduction:
        "Current clothing opportunities, documented at source and prepared for straightforward export conversations.",
      exportRoute: "Consolidated in Quanzhou · Exported via Xiamen Port",
      inspection: "Real stock evidence and video inspection available",
      flexibleBuying: "Stock lots and single styles, clearly separated",
      latestStock: "Latest stock",
      readyNow: "Ready for buyer review",
      lotDescription: "Mixed clothing lots for package, lot, or container buying.",
      styleDescription: "Defined styles with clear variants and quantities.",
      sourcingDesk: "Quanzhou sourcing desk",
      responseNote: "Structured product inquiries, answered by a trade specialist.",
      browseCatalog: "Browse stock",
      buyingPrinciples: "Clear terms. Current verification. Export support.",
    },
    validation: {
      required: "This field is required.",
      invalidWhatsapp: "Enter a valid WhatsApp number.",
      selectProduct: "Select at least one product or describe your requirement.",
      tryAgain: "Something went wrong. Keep your details and try again.",
    },
    accessibility: {
      mainNavigation: "Main navigation",
      openMenu: "Open navigation",
      closeMenu: "Close navigation",
      changeLanguage: "Change language",
      skipToContent: "Skip to content",
      currentLanguage: "English",
    },
    locale: {
      switchLabel: "العربية",
    },
    footer: {
      summary:
        "Wholesale clearance clothing sourced with traceable stock information and practical export support.",
      tradeDesk: "Trade desk",
      navigation: "Supply routes",
      note: "Availability is confirmed before every quotation.",
      rights: "Wholesale inquiries only.",
    },
    notFound: {
      eyebrow: "404 · ٤٠٤",
      title: "Page not found · الصفحة غير موجودة",
      description:
        "This address is unavailable. هذا العنوان غير متاح. Return to current stock in English or Arabic.",
      englishHome: "English stock",
      arabicHome: "المخزون العربي",
    },
    loading: "Checking current stock…",
  },
  ar: {
    brand: {
      name: "هاربور ستوك",
      descriptor: "ملابس تصفية بالجملة",
    },
    navigation: {
      catalog: "الكتالوج",
      stockLots: "دفعات المخزون",
      singleStyles: "الموديلات المنفردة",
      trustCenter: "مركز الثقة",
      howToBuy: "طريقة الشراء",
      contact: "اتصل بنا",
    },
    statuses: {
      readyStock: "مخزون جاهز",
      factoryBooking: "حجز مصنع",
      soldOut: "نفد المخزون",
      draft: "مسودة",
      archived: "مؤرشف",
    },
    inquiry: {
      list: "قائمة الاستفسار",
      itemCount: (count: number) => `قائمة الاستفسار، ${count} عناصر`,
      add: "أضف إلى قائمة الاستفسار",
      selected: "تم اختياره للاستفسار",
      empty: "قائمة الاستفسار فارغة.",
      review: "راجع قائمة الاستفسار",
    },
    trade: {
      kicker: "مصدر موثّق لبضائع التصفية",
      title: "مخزون مخصص لتجار الجملة الجادين.",
      introduction:
        "فرص حالية للملابس موثقة من المصدر ومجهزة لمحادثات تصدير واضحة ومباشرة.",
      exportRoute: "تجميع في تشيوانتشو · تصدير عبر ميناء شيامن",
      inspection: "توثيق حقيقي للمخزون وإمكانية المعاينة بالفيديو",
      flexibleBuying: "دفعات مخزون وموديلات منفردة بتصنيف واضح",
      latestStock: "أحدث المخزون",
      readyNow: "جاهز لمراجعة المشتري",
      lotDescription: "دفعات ملابس متنوعة للشراء بالحزمة أو الدفعة أو الحاوية.",
      styleDescription: "موديلات محددة بمقاسات وكميات واضحة.",
      sourcingDesk: "مكتب التوريد في تشيوانتشو",
      responseNote: "استفسارات منظمة يجيب عنها مختص بالتجارة.",
      browseCatalog: "تصفح المخزون",
      buyingPrinciples: "شروط واضحة. تحقق حديث. دعم للتصدير.",
    },
    validation: {
      required: "هذا الحقل مطلوب.",
      invalidWhatsapp: "أدخل رقم واتساب صحيحًا.",
      selectProduct: "اختر منتجًا واحدًا على الأقل أو وضّح طلبك.",
      tryAgain: "حدث خطأ. احتفظ ببياناتك وحاول مرة أخرى.",
    },
    accessibility: {
      mainNavigation: "التنقل الرئيسي",
      openMenu: "فتح قائمة التنقل",
      closeMenu: "إغلاق قائمة التنقل",
      changeLanguage: "تغيير اللغة",
      skipToContent: "انتقل إلى المحتوى",
      currentLanguage: "العربية",
    },
    locale: {
      switchLabel: "English",
    },
    footer: {
      summary:
        "ملابس تصفية بالجملة مع معلومات مخزون قابلة للتتبع ودعم عملي للتصدير.",
      tradeDesk: "مكتب التجارة",
      navigation: "مسارات التوريد",
      note: "يتم تأكيد التوفر قبل كل عرض سعر.",
      rights: "للاستفسارات بالجملة فقط.",
    },
    notFound: {
      eyebrow: "404 · ٤٠٤",
      title: "Page not found · الصفحة غير موجودة",
      description:
        "هذا العنوان غير متاح. This address is unavailable. ارجع إلى المخزون الحالي بالعربية أو الإنجليزية.",
      englishHome: "English stock",
      arabicHome: "المخزون العربي",
    },
    loading: "جارٍ التحقق من المخزون الحالي…",
  },
} as const

export type Dictionary = (typeof dictionaries)[SupportedLocale]

export function getDictionary(locale: SupportedLocale): Dictionary {
  return dictionaries[locale]
}
