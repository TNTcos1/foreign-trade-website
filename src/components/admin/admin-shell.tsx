import type { UserRole } from "@prisma/client"
import Link from "next/link"
import type { ReactNode } from "react"

import { LogoutButton } from "@/components/admin/logout-button"
import { can } from "@/modules/auth/permissions"

type AdminShellProps = {
  children: ReactNode
  user: {
    name: string
    email: string
    role: UserRole
  }
}

export function AdminShell({ children, user }: AdminShellProps) {
  const canEditProducts = can(user.role, "products:manage")
  const canEditContent = can(user.role, "content:manage")
  const canManageUsers = can(user.role, "users:manage")

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">Skip to workspace</a>
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span>HS</span>
          <strong>Harbor Stock</strong>
          <small>Inspection control room</small>
        </Link>
        <nav aria-label="Admin navigation">
          <Link href="/admin">Overview</Link>
          {canEditProducts ? <Link href="/admin/products">Product ledger</Link> : null}
          {canEditContent ? <Link href="/admin/content">Content desk</Link> : null}
          {canManageUsers ? <Link href="/admin/users">Staff access</Link> : null}
          {user.role === "SALES" ? <span aria-disabled="true">Assigned inquiries · Task 9</span> : null}
        </nav>
        <div className="admin-sidebar__route">
          <span>Consolidation</span>
          <strong>Quanzhou</strong>
          <span>Export port</span>
          <strong>Xiamen</strong>
        </div>
        <div className="admin-sidebar__user">
          <span>{user.role}</span>
          <strong>{user.name}</strong>
          <small>{user.email}</small>
          <LogoutButton />
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topline">
          <p>Internal inventory and publishing system</p>
          <a href="/en" target="_blank" rel="noreferrer">Open buyer site ↗</a>
        </header>
        <main id="admin-main" className="admin-main">{children}</main>
      </div>
    </div>
  )
}
