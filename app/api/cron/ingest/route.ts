import "server-only"
import { NextResponse } from "next/server"
import { runDueIngest } from "@/lib/ingest/scheduler"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// Fired by Vercel Cron (see vercel.json). Runs a discovery refresh only when the
// admin-configured interval is due. Protected by CRON_SECRET when set.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
  const result = await runDueIngest()
  return NextResponse.json({ ok: true, ...result })
}
