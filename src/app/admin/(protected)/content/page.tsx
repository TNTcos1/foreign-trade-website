import Link from "next/link"

import { listAdminContentPages } from "@/modules/admin/queries"
import { requireAdminPageSession } from "@/modules/auth/page-session"

function stateLabel(state: "MISSING" | "DRAFT" | "PUBLISHED") {
  return state === "PUBLISHED" ? "Published" : state === "DRAFT" ? "Draft" : "Missing"
}

export default async function AdminContentPage() {
  await requireAdminPageSession("content:manage")
  const pages = await listAdminContentPages()

  return (
    <>
      <header className="admin-page-heading admin-page-heading--ledger">
        <div>
          <p className="eyebrow">Content desk / public trust</p>
          <h1>Proof needs the right words.</h1>
          <p>
            Maintain company evidence, buying guidance, market pages, and policy
            copy without allowing an unfinished locale into public view.
          </p>
        </div>
        <span className="admin-heading-stamp">{pages.length.toString().padStart(2, "0")} controlled pages</span>
      </header>

      <section className="admin-ledger" aria-labelledby="admin-content-title">
        <div className="admin-ledger__heading">
          <div><p className="eyebrow">Editorial register</p><h2 id="admin-content-title">Language publication ledger</h2></div>
          <span>English approval precedes Arabic</span>
        </div>
        <div className="admin-content-grid">
          {pages.map((page, index) => (
            <Link className="admin-content-card" href={`/admin/content/${page.slug}`} key={page.id}>
              <span className="admin-content-card__number">{(index + 1).toString().padStart(2, "0")}</span>
              <span className="admin-content-card__type">{page.pageType}</span>
              <h2>{page.translations.find(({ locale }) => locale === "en")?.title ?? page.slug}</h2>
              <p>{page.slug}</p>
              <div className="admin-locale-state">
                <span data-state={page.localeStates.en.toLowerCase()}>EN {stateLabel(page.localeStates.en)}</span>
                <span data-state={page.localeStates.ar.toLowerCase()}>AR {stateLabel(page.localeStates.ar)}</span>
              </div>
              <strong>Edit editions →</strong>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
