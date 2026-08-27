import Link from "next/link"
import { notFound } from "next/navigation"

import { ContentEditor } from "@/components/admin/content-editor"
import { getAdminContentPage } from "@/modules/admin/queries"
import { AdminServiceError } from "@/modules/admin/validation"
import { requireAdminPageSession } from "@/modules/auth/page-session"

export default async function AdminContentEditorPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  await requireAdminPageSession("content:manage")
  const { slug: segments } = await params
  const slug = segments.join("/")
  let page
  try {
    page = await getAdminContentPage(slug)
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "INVALID_CONTENT_SLUG") {
      notFound()
    }
    throw error
  }
  if (!page) {
    notFound()
  }

  return (
    <>
      <header className="admin-page-heading admin-page-heading--editor">
        <div>
          <p className="eyebrow">Content record / {page.pageType}</p>
          <h1>{page.translations.find(({ locale }) => locale === "en")?.title ?? page.slug}</h1>
          <p>{page.slug} · Last changed {new Date(page.updatedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <Link className="text-link" href="/admin/content">← Content desk</Link>
      </header>
      <ContentEditor page={page} />
    </>
  )
}
