"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/session"
import { createApplication } from "@/lib/applications"
import { applyAndSend } from "@/lib/outreach"
import { generateBid } from "@/lib/ai/groq"

type ActionResult = { ok: true; conversationId?: string } | { ok: false; error: string }

/** Record an application without sending an email (fallback when no recipient/Gmail). */
export async function applyToCompanyAction(input: {
  companyId: string
  jobPostingId?: string
  role?: string
  channel?: string
  notes?: string
}): Promise<ActionResult> {
  const user = await requireUser()
  const result = await createApplication({
    userId: user.id,
    companyId: input.companyId,
    jobPostingId: input.jobPostingId || null,
    role: input.role?.trim() || null,
    channel: input.channel?.trim() || null,
    notes: input.notes?.trim() || null,
  })
  if (!result.ok) return { ok: false, error: result.error }
  revalidatePath("/companies")
  revalidatePath(`/companies/${input.companyId}`)
  revalidatePath("/applications")
  return { ok: true }
}

/** Apply by sending a real email from the user's Gmail. */
export async function applyAndSendAction(input: {
  companyId: string
  jobPostingId?: string
  to: string
  subject: string
  body: string
  attachmentIds?: string[]
}): Promise<ActionResult> {
  const user = await requireUser()
  const result = await applyAndSend({
    userId: user.id,
    companyId: input.companyId,
    jobPostingId: input.jobPostingId || null,
    to: input.to,
    subject: input.subject,
    body: input.body,
    attachmentIds: input.attachmentIds,
  })
  if (!result.ok) return { ok: false, error: result.error }
  revalidatePath("/companies")
  revalidatePath(`/companies/${input.companyId}`)
  revalidatePath("/applications")
  revalidatePath("/inbox")
  return { ok: true, conversationId: result.data.conversationId }
}

/** Generate an AI bid for the Apply modal (Groq). */
export async function generateBidAction(input: {
  jobPostingId?: string
  companyId?: string
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const user = await requireUser()
  const result = await generateBid(user.id, {
    jobPostingId: input.jobPostingId || null,
    companyId: input.companyId || null,
  })
  return result.ok ? { ok: true, text: result.data.text } : { ok: false, error: result.error }
}
