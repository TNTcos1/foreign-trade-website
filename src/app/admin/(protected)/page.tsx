import Link from "next/link"

import {
  listAdminContentPages,
  listAdminProducts,
} from "@/modules/admin/queries"
import { can } from "@/modules/auth/permissions"
import { requireAdminPageSession } from "@/modules/auth/page-session"

export default async function AdminDashboardPage() {
  const session = await requireAdminPageSession()
  const editable = can(session.user.role, "products:manage")
  const [products, pages] = editable
    ? await Promise.all([listAdminProducts(), listAdminContentPages()])
    : [[], []]
  const publicProducts = products.filter(({ publishedAt }) => publishedAt).length
  const draftLocales = products.reduce(
    (count, product) => count + Object.values(product.localeStates).filter((state) => state === "DRAFT").length,
    0,
  ) + pages.reduce(
    (count, page) => count + Object.values(page.localeStates).filter((state) => state === "DRAFT").length,
    0,
  )

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">Shift overview / {session.user.role}</p>
          <h1>Evidence before exposure.</h1>
          <p>
            The public catalog only receives inventory and language editions that
            have passed explicit staff publication.
          </p>
        </div>
        <time dateTime={new Date().toISOString()}>
          Session expires<br />{session.expiresAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
        </time>
      </header>

      {editable ? (
        <>
          <section className="admin-metrics" aria-label="Publishing overview">
            <article><span>01</span><strong>{products.length}</strong><p>Product records</p></article>
            <article><span>02</span><strong>{publicProducts}</strong><p>Public products</p></article>
            <article><span>03</span><strong>{draftLocales}</strong><p>Locale drafts waiting</p></article>
            <article><span>04</span><strong>{pages.length}</strong><p>Content records</p></article>
          </section>

          <section className="admin-dispatch-grid">
            <Link href="/admin/products" className="admin-dispatch-card">
              <span>Product ledger</span>
              <h2>Verify stock facts and publish offers.</h2>
              <p>Quantity, MOQ, price reference, warehouse media, English and Arabic editions.</p>
              <strong>Open ledger →</strong>
            </Link>
            <Link href="/admin/content" className="admin-dispatch-card admin-dispatch-card--sand">
              <span>Content desk</span>
              <h2>Maintain the trust narrative.</h2>
              <p>Company proof, buying process, contact and market-specific buyer guidance.</p>
              <strong>Open content desk →</strong>
            </Link>
          </section>
        </>
      ) : (
        <section className="admin-empty-state">
          <span>SALES</span>
          <h2>Your assigned inquiry queue arrives in Task 9.</h2>
          <p>This role cannot read or mutate product, content, media, translation, user, or settings records.</p>
        </section>
      )}
    </>
  )
}
