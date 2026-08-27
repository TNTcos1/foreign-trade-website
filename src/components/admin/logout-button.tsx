"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function LogoutButton() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function logout() {
    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/auth/logout", { method: "POST" })
      if (response.ok) {
        router.replace("/admin/login")
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <button className="admin-logout" disabled={submitting} onClick={logout} type="button">
      {submitting ? "Signing out…" : "Sign out"}
    </button>
  )
}
