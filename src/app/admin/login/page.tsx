import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { AdminLoginForm } from "@/components/admin/login-form"
import {
  ADMIN_SESSION_COOKIE,
  readAdminSession,
} from "@/modules/auth/session"

export default async function AdminLoginPage() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  if (token && await readAdminSession(token)) {
    redirect("/admin")
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-page__identity" aria-labelledby="admin-login-title">
        <div>
          <p className="eyebrow">Quanzhou inspection desk / Xiamen export route</p>
          <h1 id="admin-login-title">Stock truth, before the sales promise.</h1>
          <p>
            Review warehouse evidence, prepare bilingual listings, and publish only
            what the export team has verified.
          </p>
        </div>
        <dl className="admin-login-page__ledger">
          <div><dt>01</dt><dd>Private drafts</dd></div>
          <div><dt>02</dt><dd>Locale approval</dd></div>
          <div><dt>03</dt><dd>Controlled media</dd></div>
        </dl>
      </section>
      <section className="admin-login-page__form" aria-label="Staff sign in">
        <div className="admin-login-page__mark" aria-hidden="true">HS</div>
        <p className="eyebrow">Restricted operations</p>
        <h2>Control room sign in</h2>
        <p>Use your staff credentials. Buyer accounts are not supported here.</p>
        <AdminLoginForm />
      </section>
    </main>
  )
}
