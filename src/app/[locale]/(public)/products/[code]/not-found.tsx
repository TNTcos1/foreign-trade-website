import Link from "next/link"

export default function ProductNotFound() {
  return (
    <main id="main-content" className="not-found-page" tabIndex={-1}>
      <div className="page-shell not-found-page__panel">
        <p className="eyebrow">404 · ٤٠٤</p>
        <h1>Stock record unavailable · سجل المخزون غير متاح</h1>
        <p>This product is not public in the requested language. هذا المنتج غير متاح للعامة باللغة المطلوبة.</p>
        <div className="not-found-page__actions">
          <Link className="button button--primary" href="/en/stock">English stock</Link>
          <Link className="button button--secondary" href="/ar/stock">المخزون العربي</Link>
        </div>
      </div>
    </main>
  )
}
