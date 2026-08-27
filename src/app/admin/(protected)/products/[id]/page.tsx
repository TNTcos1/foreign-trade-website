import Link from "next/link"
import { notFound } from "next/navigation"

import { ProductEditor } from "@/components/admin/product-editor"
import { getAdminProduct } from "@/modules/admin/queries"
import { AdminServiceError } from "@/modules/admin/validation"
import { requireAdminPageSession } from "@/modules/auth/page-session"

export default async function AdminProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminPageSession("products:manage")
  const { id } = await params
  let product
  try {
    product = await getAdminProduct(id)
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "INVALID_ENTITY_ID") {
      notFound()
    }
    throw error
  }
  if (!product) {
    notFound()
  }

  return (
    <>
      <header className="admin-page-heading admin-page-heading--editor">
        <div>
          <p className="eyebrow">Product record / {product.status.replaceAll("_", " ")}</p>
          <h1>{product.translations.find(({ locale }) => locale === "en")?.title ?? product.code}</h1>
          <p>
            {product.code} · Last changed {new Date(product.updatedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <Link className="text-link" href="/admin/products">← Product ledger</Link>
      </header>
      <ProductEditor initialProduct={product} mode="edit" />
    </>
  )
}
