import { prisma } from "@/lib/prisma"
import { runIngest } from "@/lib/ingest/run"

// Shared scheduler logic. Triggered two ways:
//  - locally / long-running server: an in-process timer (startIngestScheduler)
//  - on Vercel (serverless): the /api/cron/ingest route fired by Vercel Cron
// Both call runDueIngest(), which only runs when the configured interval is due.

let started = false
let running = false
const CHECK_INTERVAL_MS = 5 * 60 * 1000 // local timer re-check every 5 minutes

/** Run a discovery refresh if the schedule is enabled and due. Safe to call often. */
export async function runDueIngest(): Promise<{ ran: boolean; created: number }> {
  if (running) return { ran: false, created: 0 }

  let sched
  try {
    sched = await prisma.ingestSchedule.findUnique({ where: { id: "singleton" } })
  } catch {
    return { ran: false, created: 0 }
  }
  if (!sched?.enabled) return { ran: false, created: 0 }
  if (sched.nextRunAt && sched.nextRunAt.getTime() > Date.now()) return { ran: false, created: 0 }

  running = true
  const next = new Date(Date.now() + sched.intervalHours * 3600_000)
  try {
    const summary = await runIngest({ actorUserId: null })
    await prisma.ingestSchedule.update({
      where: { id: "singleton" },
      data: { lastRunAt: new Date(), nextRunAt: next },
    })
    console.log(`[scheduler] refresh done: +${summary.jobsCreated} new. Next at ${next.toISOString()}`)
    return { ran: true, created: summary.jobsCreated }
  } catch (err) {
    console.error("[scheduler] refresh failed:", err)
    try {
      await prisma.ingestSchedule.update({ where: { id: "singleton" }, data: { nextRunAt: next } })
    } catch {
      /* ignore */
    }
    return { ran: false, created: 0 }
  } finally {
    running = false
  }
}

/** Start the in-process timer (no-op on Vercel, which uses the cron route instead). */
export function startIngestScheduler() {
  if (started || process.env.VERCEL) return
  started = true
  console.log("[scheduler] in-process auto-refresh scheduler armed (checks every 5 min)")
  setInterval(() => void runDueIngest(), CHECK_INTERVAL_MS)
  setTimeout(() => void runDueIngest(), 30_000) // catch up shortly after boot
}
