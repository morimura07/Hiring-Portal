"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import type { MessageDirection } from "@prisma/client"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { sendMessage } from "@/lib/inbox"
import { sendReply } from "@/lib/outreach"
import { syncUserInbox } from "@/lib/google/gmail"

type ActionResult = { ok: true } | { ok: false; error: string }

export async function sendMessageAction(input: {
  conversationId: string
  body: string
  direction: MessageDirection
  attachmentIds?: string[]
}): Promise<ActionResult> {
  const user = await requireUser()
  const direction: MessageDirection = input.direction === "INBOUND" ? "INBOUND" : "OUTBOUND"

  // Outbound on a Gmail-linked thread → send a real email (with attachments).
  if (direction === "OUTBOUND") {
    const conv = await prisma.conversation.findFirst({
      where: { id: input.conversationId, application: { userId: user.id } },
      select: { gmailThreadId: true },
    })
    if (conv?.gmailThreadId) {
      const r = await sendReply({
        userId: user.id,
        conversationId: input.conversationId,
        body: input.body,
        attachmentIds: input.attachmentIds,
      })
      if (r.ok) revalidatePath("/inbox")
      return r.ok ? { ok: true } : { ok: false, error: r.error }
    }
  }

  // Otherwise log manually (non-Gmail thread, or recording a received reply).
  const result = await sendMessage({
    actorId: user.id,
    conversationId: input.conversationId,
    body: input.body,
    direction,
    attachmentIds: input.attachmentIds,
  })
  if (result.ok) revalidatePath("/inbox")
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

export async function syncInboxAction(): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  const user = await requireUser()
  try {
    const imported = await syncUserInbox(user.id)
    revalidatePath("/inbox")
    return { ok: true, imported }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
