"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/session"
import { addPerformanceEntry, deletePerformanceEntry } from "@/lib/performance"

type ActionResult = { ok: true } | { ok: false; error: string }

export async function addScoreAction(input: {
  userId: string
  amount: number
  period: string
  note?: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()
  const result = await addPerformanceEntry({
    actorId: admin.id,
    userId: input.userId,
    amount: input.amount,
    period: input.period,
    note: input.note,
  })
  if (result.ok) {
    revalidatePath("/score-management")
    revalidatePath("/dashboard")
  }
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

export async function deleteScoreAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const result = await deletePerformanceEntry({ actorId: admin.id, id })
  if (result.ok) revalidatePath("/score-management")
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}
