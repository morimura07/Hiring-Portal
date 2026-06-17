import { requireUser } from "@/lib/session"
import { isGmailConnected, googleConfigured } from "@/lib/google/oauth"
import { getAiStatus } from "@/lib/ai/groq"
import { getSchedule } from "@/lib/ingest/schedule"
import { GmailCard } from "@/components/settings/gmail-card"
import { AiCard } from "@/components/settings/ai-card"
import { AutoRefreshCard } from "@/components/settings/auto-refresh-card"

export const dynamic = "force-dynamic"

const STATUS_MESSAGES: Record<string, { text: string; tone: "ok" | "error" }> = {
  connected: { text: "Gmail connected successfully.", tone: "ok" },
  error: { text: "Couldn't connect Gmail. Please try again.", tone: "error" },
  denied: { text: "Gmail connection was cancelled.", tone: "error" },
  unconfigured: { text: "Gmail isn't configured on the server.", tone: "error" },
}

export default async function SettingsPage({ searchParams }: { searchParams: { gmail?: string } }) {
  const user = await requireUser()
  const gmail = await isGmailConnected(user.id)
  const ai = await getAiStatus(user.id)
  const schedule = user.role === "ADMIN" ? await getSchedule() : null
  const status = searchParams.gmail ? STATUS_MESSAGES[searchParams.gmail] : undefined

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-medium tracking-[-0.01em]">Settings</h2>
        <p className="text-sm text-muted-foreground">Connect email and manage your account.</p>
      </div>

      {status && (
        <div
          className={
            status.tone === "ok"
              ? "rounded-lg border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "rounded-lg border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          }
        >
          {status.text}
        </div>
      )}

      <GmailCard connected={gmail.connected} email={gmail.email} configured={googleConfigured()} />
      <AiCard hasKey={ai.hasKey} bidProfile={ai.bidProfile} />
      {schedule && (
        <AutoRefreshCard
          enabled={schedule.enabled}
          intervalHours={schedule.intervalHours}
          lastRunAt={schedule.lastRunAt?.toISOString() ?? null}
          nextRunAt={schedule.nextRunAt?.toISOString() ?? null}
        />
      )}
    </div>
  )
}
