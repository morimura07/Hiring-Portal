import "server-only"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { runIngest, ALL_SOURCES, type SourceKey } from "@/lib/ingest/run"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let sources: SourceKey[] | undefined
  try {
    const body = (await request.json()) as { sources?: string[] }
    if (Array.isArray(body?.sources)) {
      sources = body.sources.filter((s): s is SourceKey =>
        (ALL_SOURCES as readonly string[]).includes(s),
      )
    }
  } catch {
    // no body → ingest all sources
  }

  try {
    const summary = await runIngest({ sources, actorUserId: user.id })
    return NextResponse.json({ ok: true, summary })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
