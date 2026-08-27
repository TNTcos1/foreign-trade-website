import { StaffUsersManager } from "@/components/admin/staff-users-manager"
import { listAdminUsers } from "@/modules/admin/user-service"
import { requireAdminPageSession } from "@/modules/auth/page-session"

export default async function AdminUsersPage() {
  const session = await requireAdminPageSession("users:manage")
  const users = await listAdminUsers()

  return (
    <>
      <header className="admin-page-heading admin-page-heading--ledger">
        <div>
          <p className="eyebrow">Staff access / account control</p>
          <h1>Keep the right hands on the ledger.</h1>
          <p>
            Review staff access, role assignments, and account readiness without
            exposing credentials or internal authentication records.
          </p>
        </div>
        <span className="admin-heading-stamp">
          {users.length.toString().padStart(2, "0")} staff records
        </span>
      </header>

      <section className="admin-ledger" aria-labelledby="admin-users-title">
        <div className="admin-ledger__heading">
          <div>
            <p className="eyebrow">Access register</p>
            <h2 id="admin-users-title">Staff permissions ledger</h2>
          </div>
          <span>ADMIN-controlled access</span>
        </div>
        <StaffUsersManager actorId={session.user.id} initialUsers={users} />
      </section>
    </>
  )
}
