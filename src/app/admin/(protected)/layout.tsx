import type { ReactNode } from "react"

import { AdminShell } from "@/components/admin/admin-shell"
import { requireAdminPageSession } from "@/modules/auth/page-session"

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await requireAdminPageSession()
  return <AdminShell user={session.user}>{children}</AdminShell>
}
