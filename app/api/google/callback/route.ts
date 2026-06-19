import "server-only"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { exchangeCode, getProfileEmail, saveGoogleAccount, originFromRequest } from "@/lib/google/oauth"
import { writeAudit } from "@/lib/audit"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const cookieState = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith("g_oauth_state="))
    ?.split("=")[1]

  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))

  if (url.searchParams.get("error")) {
    return NextResponse.redirect(new URL("/settings?gmail=denied", request.url))
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/settings?gmail=error", request.url))
  }

  try {
    const tokens = await exchangeCode(code, originFromRequest(request))
    const email = await getProfileEmail(tokens.access_token)
    await saveGoogleAccount(user.id, tokens, email)
    await writeAudit({ actorUserId: user.id, action: "gmail.connect", entityType: "GoogleAccount", metadata: { email } })

    const res = NextResponse.redirect(new URL("/settings?gmail=connected", request.url))
    res.cookies.delete("g_oauth_state")
    return res
  } catch (err) {
    console.error("[gmail] callback error:", err)
    return NextResponse.redirect(new URL("/settings?gmail=error", request.url))
  }
}
