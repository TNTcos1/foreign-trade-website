export default function ProductLoading() {
  return (
    <main id="main-content" className="loading-state page-shell" tabIndex={-1} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading product details</span>
      <div className="loading-state__eyebrow" />
      <div className="loading-state__title" />
      <div className="loading-state__copy" />
    </main>
  )
}
