import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { isSupportedLocale } from "@/modules/localization/config"

export const metadata: Metadata = {
  robots: { index: true, follow: true },
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isSupportedLocale(locale)) {
    notFound()
  }

  const copy = locale === "ar"
    ? {
        eyebrow: "خصوصية استفسارات الجملة",
        title: "نستخدم بياناتك لإعداد عرض السعر والمتابعة فقط.",
        sections: [
          ["ما نجمعه", "الاسم والدولة وبيانات التواصل والشركة الاختيارية والمنتجات أو المتطلبات التي ترسلها."],
          ["لماذا نستخدمه", "للتحقق من التوفر وإعداد عرض السعر والتواصل بشأن هذا الاستفسار مع فريق المبيعات المخول."],
          ["ما لا نفعله", "لا ننشئ حسابًا للمشتري، ولا نرسل رقم واتساب أو نص النموذج إلى أدوات التحليل. نقرة واتساب ليست استفسارًا صالحًا أو تواصلًا مؤكدًا."],
        ],
      }
    : {
        eyebrow: "Wholesale inquiry privacy",
        title: "We use your details only to quote and follow up.",
        sections: [
          ["What we collect", "Your name, country, contact details, optional company, and the products or requirements you submit."],
          ["Why we use it", "To verify availability, prepare a quotation, and let authorized sales staff communicate about this inquiry."],
          ["What we do not do", "We do not create a buyer account or send WhatsApp numbers or form text to analytics. A WhatsApp click is not a valid inquiry or confirmed communication."],
        ],
      }

  return (
    <main id="main-content" tabIndex={-1} className="privacy-page">
      <div className="page-shell privacy-page__content">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <div className="privacy-page__sections">
          {copy.sections.map(([title, body]) => (
            <section key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
