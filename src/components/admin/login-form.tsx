"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

const errorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: "The email or password was not accepted.",
  RATE_LIMITED: "Too many attempts. Wait a moment before trying again.",
  INVALID_ORIGIN: "This sign-in request could not be verified.",
}

export function AdminLoginForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      })
      const result = await response.json() as {
        ok: boolean
        code?: string
        redirectUrl?: string
      }
      if (!response.ok || !result.ok) {
        setError(errorMessages[result.code ?? ""] ?? "Sign in is unavailable. Try again.")
        return
      }
      router.replace(result.redirectUrl ?? "/admin")
      router.refresh()
    } catch {
      setError("Sign in is unavailable. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      {error ? <p className="admin-alert" role="alert">{error}</p> : null}
      <label>
        Work email
        <input
          name="email"
          type="email"
          autoComplete="username"
          maxLength={254}
          required
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={1024}
          required
        />
      </label>
      <button className="button button--primary" disabled={submitting} type="submit">
        {submitting ? "Checking credentials…" : "Enter control room"}
      </button>
      <p className="admin-login-form__note">
        هاربور ستوك — staff access only. Arabic content is reviewed before publication.
      </p>
    </form>
  )
}
