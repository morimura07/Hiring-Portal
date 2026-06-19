import "server-only"
import crypto from "crypto"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { buildAuthUrl, googleConfigured, originFromRequest } from "@/lib/google/oauth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/settings?gmail=unconfigured", request.url))
  }

  const state = crypto.randomUUID()
  const res = NextResponse.redirect(buildAuthUrl(state, originFromRequest(request)))
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })
  return res
}
