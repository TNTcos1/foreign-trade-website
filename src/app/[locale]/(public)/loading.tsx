export default function PublicLoading() {
  return (
    <main
      id="main-content"
      className="page-shell loading-state"
      tabIndex={-1}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="loading-state__eyebrow" />
      <div className="loading-state__title" />
      <div className="loading-state__copy" />
      <span className="sr-only">Loading · جارٍ التحميل</span>
    </main>
  )
}
