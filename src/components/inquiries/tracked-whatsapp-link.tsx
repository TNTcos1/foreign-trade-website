"use client"

import type { ReactNode } from "react"

import { trackPublicEvent } from "@/modules/analytics/events"
import type { SupportedLocale } from "@/modules/localization/config"

export function TrackedWhatsAppLink({
  href,
  locale,
  itemCount,
  placement,
  className,
  children,
}: {
  href: string
  locale: SupportedLocale
  itemCount?: number
  placement: "product_detail" | "inquiry_success"
  className?: string
  children: ReactNode
}) {
  return (
    <a
      className={className}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      onClick={() => trackPublicEvent({
        name: "whatsapp_click",
        locale,
        itemCount,
        placement,
      })}
    >
      {children}
    </a>
  )
}
