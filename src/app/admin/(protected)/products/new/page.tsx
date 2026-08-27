import Link from "next/link"

import { ProductEditor } from "@/components/admin/product-editor"
import { requireAdminPageSession } from "@/modules/auth/page-session"

export default async function NewAdminProductPage() {
  await requireAdminPageSession("products:manage")

  return (
    <>
      <header className="admin-page-heading admin-page-heading--editor">
        <div>
          <p className="eyebrow">New record / private by default</p>
          <h1>Build the evidence before the listing.</h1>
          <p>
            Capture commercial facts and English source copy first. Media,
            Arabic review, and publication controls unlock after creation.
          </p>
        </div>
        <Link className="text-link" href="/admin/products">← Product ledger</Link>
      </header>
      <ProductEditor mode="create" />
    </>
  )
}
