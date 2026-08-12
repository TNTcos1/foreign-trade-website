import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { ok: false, code: "ADMIN_AUTH_UNAVAILABLE" },
    { status: 503 },
  )
}
