import type { Metadata } from "next"
import type { ReactNode } from "react"

import "../globals.css"

export const metadata: Metadata = {
  title: "Harbor Stock Control Room",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function AdminRootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  )
}
