"use client"

import { useState, type FormEvent } from "react"

import type { AdminUserView } from "@/modules/admin/user-service"

type StaffUsersManagerProps = {
  actorId: string
  initialUsers: AdminUserView[]
}

type UserMutationBody =
  | { action: "change_role"; role: AdminUserView["role"] }
  | { action: "set_active"; active: boolean }
  | { action: "reset_password"; password: string }

type UserMutationResponse = {
  ok: boolean
  code?: string
  user?: AdminUserView
}

type Feedback = {
  kind: "alert" | "status"
  message: string
}

type PasswordFields = {
  password: string
  confirmation: string
}

type PendingAction = {
  userId: string
  action: UserMutationBody["action"]
}

const roleLabels: Record<AdminUserView["role"], string> = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  SALES: "Sales",
}

const pendingActionLabels = {
  set_active: "Updating access for",
  reset_password: "Resetting password for",
} as const

const safeErrorMessages: Record<string, string> = {
  LAST_ACTIVE_ADMIN: "Cannot remove the last active admin.",
  SELF_DEACTIVATION_FORBIDDEN: "You cannot lock your own account.",
  SELF_DEMOTION_FORBIDDEN: "You cannot lock your own account.",
  INVALID_PASSWORD: "Use 12–1024 characters with uppercase, lowercase, number, and symbol.",
  INVALID_ENTITY_ID: "This staff record could not be updated. Refresh and try again.",
  INVALID_USER_ROLE: "Choose Admin, Editor, or Sales and try again.",
  INVALID_ACTIVE_STATE: "This access state is no longer valid. Refresh and try again.",
  ADMIN_USER_NOT_FOUND: "This staff record is no longer available. Refresh and try again.",
  ACTOR_NOT_FOUND: "Your staff record is no longer available. Sign in again and retry.",
}

function errorMessage(code: string | undefined): string {
  return safeErrorMessages[code ?? ""] ?? "Staff account controls are unavailable right now."
}

function formatUpdatedAt(updatedAt: string): string {
  const formatted = new Date(updatedAt).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })
  return `${formatted} UTC`
}

async function postUserAction(
  userId: string,
  body: UserMutationBody,
): Promise<UserMutationResponse> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => null) as UserMutationResponse | null

  if (!response.ok || result?.ok !== true) {
    return {
      ok: false,
      code: typeof result?.code === "string" ? result.code : undefined,
    }
  }

  return result
}

export function StaffUsersManager({
  actorId,
  initialUsers,
}: StaffUsersManagerProps) {
  const [users, setUsers] = useState(initialUsers)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({})
  const [passwordFields, setPasswordFields] = useState<Record<string, PasswordFields>>({})

  function fieldsFor(userId: string): PasswordFields {
    return passwordFields[userId] ?? { password: "", confirmation: "" }
  }

  function setUserFeedback(userId: string, nextFeedback: Feedback | null) {
    setFeedback((current) => {
      const next = { ...current }
      if (nextFeedback) {
        next[userId] = nextFeedback
      } else {
        delete next[userId]
      }
      return next
    })
  }

  function updatePasswordField(
    userId: string,
    field: keyof PasswordFields,
    value: string,
  ) {
    setPasswordFields((current) => ({
      ...current,
      [userId]: { ...fieldsFor(userId), [field]: value },
    }))
  }

  function replaceUser(updatedUser: AdminUserView) {
    setUsers((current) => current.map((user) =>
      user.id === updatedUser.id ? updatedUser : user
    ))
  }

  async function updateUser(
    user: AdminUserView,
    body: Extract<UserMutationBody, { action: "change_role" | "set_active" }>,
    successMessage: string,
  ) {
    setPending({ userId: user.id, action: body.action })
    setUserFeedback(user.id, null)

    try {
      const result = await postUserAction(user.id, body)
      if (!result.ok) {
        setUserFeedback(user.id, { kind: "alert", message: errorMessage(result.code) })
        return
      }
      if (!result.user) {
        setUserFeedback(user.id, {
          kind: "alert",
          message: "Staff account controls are unavailable right now.",
        })
        return
      }

      replaceUser(result.user)
      setUserFeedback(user.id, { kind: "status", message: successMessage })
    } catch {
      setUserFeedback(user.id, {
        kind: "alert",
        message: "Staff account controls are unavailable right now.",
      })
    } finally {
      setPending(null)
    }
  }

  async function resetPassword(
    event: FormEvent<HTMLFormElement>,
    user: AdminUserView,
  ) {
    event.preventDefault()
    const fields = fieldsFor(user.id)

    if (fields.password !== fields.confirmation) {
      setUserFeedback(user.id, {
        kind: "alert",
        message: "The new password fields must match exactly.",
      })
      return
    }

    setPending({ userId: user.id, action: "reset_password" })
    setUserFeedback(user.id, null)

    try {
      const result = await postUserAction(user.id, {
        action: "reset_password",
        password: fields.password,
      })
      if (!result.ok) {
        setUserFeedback(user.id, { kind: "alert", message: errorMessage(result.code) })
        return
      }

      setPasswordFields((current) => ({
        ...current,
        [user.id]: { password: "", confirmation: "" },
      }))
      setUserFeedback(user.id, {
        kind: "status",
        message: `Password reset completed for ${user.name}.`,
      })
    } catch {
      setUserFeedback(user.id, {
        kind: "alert",
        message: "Staff account controls are unavailable right now.",
      })
    } finally {
      setPending(null)
    }
  }

  if (!users.length) {
    return (
      <div className="admin-ledger__empty">
        <span>00</span>
        <div>
          <h2>No staff records available.</h2>
          <p>The protected staff register could not find an account to display.</p>
        </div>
      </div>
    )
  }

  const controlsBusy = pending !== null

  return (
    <div className="admin-users-table-wrap">
      <table className="admin-table admin-users-table">
        <caption className="sr-only">
          Staff accounts with role, access status, environment, last update, and password controls
        </caption>
        <thead>
          <tr>
            <th scope="col">Staff record</th>
            <th scope="col">Role</th>
            <th scope="col">Access</th>
            <th scope="col">Development only</th>
            <th scope="col">Last update</th>
            <th scope="col">Credential control</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = user.id === actorId
            const userPending = pending?.userId === user.id
            const fields = fieldsFor(user.id)
            const userFeedback = feedback[user.id]
            const passwordId = `staff-password-${user.id}`
            const confirmationId = `staff-password-confirmation-${user.id}`

            return (
              <tr key={user.id} aria-busy={userPending}>
                <th scope="row" data-label="Staff record">
                  <span className="admin-table__record">
                    <strong>{user.name}</strong>
                    <small>{user.email}{isSelf ? " · Your account" : ""}</small>
                  </span>
                </th>
                <td data-label="Role">
                  <label className="admin-user-select">
                    <span className="sr-only">Role for {user.name}</span>
                    <select
                      disabled={controlsBusy || isSelf}
                      onChange={(event) => {
                        const role = event.currentTarget.value as AdminUserView["role"]
                        void updateUser(
                          user,
                          { action: "change_role", role },
                          `${user.name}'s role is now ${roleLabels[role]}.`,
                        )
                      }}
                      value={user.role}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="EDITOR">Editor</option>
                      <option value="SALES">Sales</option>
                    </select>
                  </label>
                  {isSelf ? <small className="admin-user-control-note">Self-demotion locked</small> : null}
                </td>
                <td data-label="Access">
                  <div className="admin-user-cell-control">
                    <span
                      className="admin-user-status"
                      data-state={user.active ? "active" : "inactive"}
                    >
                      {user.active ? "Active" : "Inactive"}
                    </span>
                    <button
                      className="admin-user-access-button"
                      disabled={controlsBusy || (isSelf && user.active)}
                      onClick={() => void updateUser(
                        user,
                        { action: "set_active", active: !user.active },
                        `${user.name} is now ${user.active ? "inactive" : "active"}.`,
                      )}
                      type="button"
                    >
                      {userPending && pending?.action === "set_active"
                        ? `${pendingActionLabels.set_active} ${user.name}…`
                        : user.active ? "Deactivate" : "Activate"}
                    </button>
                    {isSelf && user.active
                      ? <small className="admin-user-control-note">Self-deactivation locked</small>
                      : null}
                  </div>
                </td>
                <td data-label="Development only">
                  <span className="admin-user-environment">
                    {user.developmentOnly ? "Yes" : "No"}
                  </span>
                </td>
                <td data-label="Last update">
                  <time dateTime={user.updatedAt}>{formatUpdatedAt(user.updatedAt)}</time>
                </td>
                <td data-label="Credential control">
                  <div className="admin-user-cell-control">
                    <details className="admin-password-reset">
                      <summary>Reset password</summary>
                      <form onSubmit={(event) => void resetPassword(event, user)}>
                        <label htmlFor={passwordId}>New password</label>
                        <input
                          autoComplete="new-password"
                          id={passwordId}
                          maxLength={1024}
                          minLength={12}
                          onChange={(event) => updatePasswordField(
                            user.id,
                            "password",
                            event.currentTarget.value,
                          )}
                          required
                          type="password"
                          value={fields.password}
                        />
                        <label htmlFor={confirmationId}>Confirm new password</label>
                        <input
                          autoComplete="new-password"
                          id={confirmationId}
                          maxLength={1024}
                          minLength={12}
                          onChange={(event) => updatePasswordField(
                            user.id,
                            "confirmation",
                            event.currentTarget.value,
                          )}
                          required
                          type="password"
                          value={fields.confirmation}
                        />
                        <small>12+ characters with uppercase, lowercase, number, and symbol.</small>
                        <button className="button button--secondary" disabled={controlsBusy} type="submit">
                          {userPending && pending?.action === "reset_password"
                            ? `${pendingActionLabels.reset_password} ${user.name}…`
                            : "Set new password"}
                        </button>
                      </form>
                    </details>
                    {userFeedback ? (
                      <p
                        className={userFeedback.kind === "alert" ? "admin-alert" : "admin-notice"}
                        role={userFeedback.kind}
                      >
                        {userFeedback.message}
                      </p>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
