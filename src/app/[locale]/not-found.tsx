import Link from "next/link"

export default function LocaleNotFound() {
  return (
    <main className="not-found-page">
      <div className="page-shell not-found-page__panel">
        <p className="eyebrow">404 · ٤٠٤</p>
        <h1>Page not found · الصفحة غير موجودة</h1>
        <p>
          This address is unavailable. هذا العنوان غير متاح. Return to current
          stock in English or Arabic.
        </p>
        <div className="not-found-page__actions">
          <Link className="button button--primary" href="/en">
            English stock
          </Link>
          <Link className="button button--secondary" href="/ar" lang="ar">
            المخزون العربي
          </Link>
        </div>
      </div>
    </main>
  )
}
