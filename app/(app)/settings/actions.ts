"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { requireUser, requireAdmin } from "@/lib/session"
import { disconnectGoogle } from "@/lib/google/oauth"
import { saveGroqKey, clearGroqKey, saveBidProfile } from "@/lib/ai/groq"
import { setSchedule } from "@/lib/ingest/schedule"
import { writeAudit } from "@/lib/audit"

export async function disconnectGmailAction(): Promise<{ ok: true }> {
  const user = await requireUser()
  await disconnectGoogle(user.id)
  await writeAudit({ actorUserId: user.id, action: "gmail.disconnect", entityType: "GoogleAccount" })
  revalidatePath("/settings")
  return { ok: true }
}

export async function saveGroqKeyAction(key: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  if (!key.trim()) return { ok: false, error: "Enter an API key." }
  await saveGroqKey(user.id, key)
  await writeAudit({ actorUserId: user.id, action: "ai.key_saved", entityType: "User", entityId: user.id })
  revalidatePath("/settings")
  return { ok: true }
}

export async function clearGroqKeyAction(): Promise<{ ok: true }> {
  const user = await requireUser()
  await clearGroqKey(user.id)
  revalidatePath("/settings")
  return { ok: true }
}

export async function saveBidProfileAction(profile: string): Promise<{ ok: true }> {
  const user = await requireUser()
  await saveBidProfile(user.id, profile)
  revalidatePath("/settings")
  return { ok: true }
}

export async function saveScheduleAction(input: {
  enabled: boolean
  intervalHours: number
}): Promise<{ ok: true }> {
  const admin = await requireAdmin()
  await setSchedule(input)
  await writeAudit({
    actorUserId: admin.id,
    action: "ingest.schedule",
    entityType: "IngestSchedule",
    metadata: { enabled: input.enabled, intervalHours: input.intervalHours },
  })
  revalidatePath("/settings")
  return { ok: true }
}
