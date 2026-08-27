import Link from "next/link"

import { listAdminProducts } from "@/modules/admin/queries"
import { requireAdminPageSession } from "@/modules/auth/page-session"

function stateLabel(state: "MISSING" | "DRAFT" | "PUBLISHED") {
  return state === "PUBLISHED" ? "Published" : state === "DRAFT" ? "Draft" : "Missing"
}

export default async function AdminProductsPage() {
  await requireAdminPageSession("products:manage")
  const products = await listAdminProducts()

  return (
    <>
      <header className="admin-page-heading admin-page-heading--ledger">
        <div>
          <p className="eyebrow">Product ledger / controlled inventory</p>
          <h1>Facts that can ship.</h1>
          <p>
            Keep stock evidence, commercial terms, and each language edition in
            separate states until the export desk is ready to expose them.
          </p>
        </div>
        <Link className="button button--primary" href="/admin/products/new">
          New product record
        </Link>
      </header>

      <section className="admin-ledger" aria-labelledby="admin-products-title">
        <div className="admin-ledger__heading">
          <div>
            <p className="eyebrow">Active register</p>
            <h2 id="admin-products-title">{products.length} product records</h2>
          </div>
          <span>Sorted by latest verification</span>
        </div>
        {products.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="sr-only">Product records and publication states</caption>
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Type / status</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Locales</th>
                  <th scope="col">Updated</th>
                  <th scope="col"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <th scope="row">
                      <Link className="admin-table__record" href={`/admin/products/${product.id}`}>
                        <strong>{product.translations.find(({ locale }) => locale === "en")?.title ?? "Untitled record"}</strong>
                        <small>{product.code} · {product.category}</small>
                      </Link>
                    </th>
                    <td>
                      <span className={`admin-status admin-status--${product.status.toLowerCase()}`}>
                        {product.status.replaceAll("_", " ")}
                      </span>
                      <small className="admin-table__secondary">{product.type === "STOCK_LOT" ? "Stock lot" : "Single style"}</small>
                    </td>
                    <td>{product.availableQuantity?.toLocaleString("en-US") ?? "—"}</td>
                    <td>
                      <div className="admin-locale-state" aria-label="Locale publication states">
                        <span data-state={product.localeStates.en.toLowerCase()}>EN {stateLabel(product.localeStates.en)}</span>
                        <span data-state={product.localeStates.ar.toLowerCase()}>AR {stateLabel(product.localeStates.ar)}</span>
                      </div>
                    </td>
                    <td><time dateTime={product.updatedAt}>{new Date(product.updatedAt).toLocaleDateString("en", { dateStyle: "medium" })}</time></td>
                    <td><Link className="admin-table__open" href={`/admin/products/${product.id}`}>Inspect →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-ledger__empty">
            <span>00</span>
            <div>
              <h2>No product records yet.</h2>
              <p>Start with the stock facts your inspection desk has already verified.</p>
              <Link className="text-link" href="/admin/products/new">Create the first record →</Link>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
