import type { ReactNode } from "react"

export type PublicProductStatus =
  | "READY_STOCK"
  | "FACTORY_BOOKING"
  | "SOLD_OUT"

const statusTone: Record<PublicProductStatus, string> = {
  READY_STOCK: "ready",
  FACTORY_BOOKING: "booking",
  SOLD_OUT: "sold",
}

type StatusBadgeProps = {
  status: PublicProductStatus
  children: ReactNode
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  return (
    <span className="status-badge" data-status={statusTone[status]}>
      <span className="status-badge__dot" aria-hidden="true" />
      {children}
    </span>
  )
}
