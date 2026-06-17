import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { writeAudit } from "@/lib/audit"
import { readAttachment } from "@/lib/storage"
import { getValidAccessToken } from "@/lib/google/oauth"
import { sendGmail, type OutgoingAttachment } from "@/lib/google/gmail"

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }
const ok = <T>(data: T): Result<T> => ({ ok: true, data })
const fail = (error: string): Result<never> => ({ ok: false, error })

async function loadAttachments(attachmentIds: string[] | undefined): Promise<{
  rows: { id: string }[]
  outgoing: OutgoingAttachment[]
}> {
  if (!attachmentIds?.length) return { rows: [], outgoing: [] }
  const rows = await prisma.attachment.findMany({
    where: { id: { in: attachmentIds }, messageId: null },
  })
  const outgoing = await Promise.all(
    rows.map(async (a) => ({
      filename: a.filename,
      content: await readAttachment(a.storagePath),
      contentType: a.mimeType,
    })),
  )
  return { rows: rows.map((r) => ({ id: r.id })), outgoing }
}

/**
 * Apply to a company by sending a real email from the user's Gmail.
 * Sends FIRST, then persists — so a send failure leaves no half-applied state.
 */
export async function applyAndSend(input: {
  userId: string
  companyId: string
  jobPostingId?: string | null
  to: string
  subject: string
  body: string
  attachmentIds?: string[]
}): Promise<Result<{ applicationId: string; conversationId: string }>> {
  const to = input.to.trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return fail("Enter a valid recipient email.")
  if (!input.body.trim()) return fail("Message can't be empty.")

  // Dedup: one application per company per user.
  const existing = await prisma.application.findUnique({
    where: { companyId_userId: { companyId: input.companyId, userId: input.userId } },
  })
  if (existing) return fail("You've already applied to this company — use the Inbox to follow up.")

  const token = await getValidAccessToken(input.userId)
  if (!token) return fail("Connect your Gmail first (Settings → Connect Gmail).")

  const { rows, outgoing } = await loadAttachments(input.attachmentIds)

  // 1) Send the email.
  let sent
  try {
    sent = await sendGmail(input.userId, { to, subject: input.subject, text: input.body, attachments: outgoing })
  } catch (err) {
    return fail(`Couldn't send email: ${(err as Error).message}`)
  }

  // 2) Persist application + conversation + outbound message.
  const now = new Date()
  try {
    const application = await prisma.application.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        jobPostingId: input.jobPostingId ?? null,
        role: null,
        channel: "email",
        status: "APPLIED",
      },
    })
    const conversation = await prisma.conversation.create({
      data: {
        applicationId: application.id,
        companyId: input.companyId,
        subject: input.subject,
        contactEmail: to,
        gmailThreadId: sent.threadId,
        lastMessageAt: now,
      },
    })
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        subject: input.subject,
        body: input.body,
        senderUserId: input.userId,
        fromAddress: sent.from,
        toAddress: to,
        externalId: sent.messageId,
        messageIdHeader: sent.headerMessageId,
        sentAt: now,
        readAt: now,
      },
    })
    if (rows.length) {
      await prisma.attachment.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { messageId: message.id } })
    }
    await writeAudit({
      actorUserId: input.userId,
      action: "application.create",
      entityType: "Application",
      entityId: application.id,
      metadata: { via: "email", to } as Prisma.InputJsonValue,
    })
    await writeAudit({ actorUserId: input.userId, action: "message.send", entityType: "Message", entityId: message.id })

    return ok({ applicationId: application.id, conversationId: conversation.id })
  } catch (err) {
    // Email already went out; surface but don't crash.
    return fail(`Email sent, but saving failed: ${(err as Error).message}`)
  }
}

/** Reply within an existing Gmail thread (real email). */
export async function sendReply(input: {
  userId: string
  conversationId: string
  body: string
  attachmentIds?: string[]
}): Promise<Result<{ id: string }>> {
  if (!input.body.trim()) return fail("Message can't be empty.")

  const conv = await prisma.conversation.findFirst({
    where: { id: input.conversationId, application: { userId: input.userId } },
    include: { messages: { orderBy: { sentAt: "desc" }, take: 1 } },
  })
  if (!conv) return fail("This isn't your conversation.")
  if (!conv.gmailThreadId || !conv.contactEmail) return fail("This thread isn't linked to email.")

  const token = await getValidAccessToken(input.userId)
  if (!token) return fail("Connect your Gmail first.")

  const last = conv.messages[0]
  const baseSubject = conv.subject ?? "Message"
  const subject = /^re:/i.test(baseSubject) ? baseSubject : `Re: ${baseSubject}`
  const { rows, outgoing } = await loadAttachments(input.attachmentIds)

  let sent
  try {
    sent = await sendGmail(input.userId, {
      to: conv.contactEmail,
      subject,
      text: input.body,
      attachments: outgoing,
      threadId: conv.gmailThreadId,
      inReplyTo: last?.messageIdHeader ?? undefined,
      references: last?.messageIdHeader ?? undefined,
    })
  } catch (err) {
    return fail(`Couldn't send: ${(err as Error).message}`)
  }

  const now = new Date()
  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      direction: "OUTBOUND",
      subject,
      body: input.body,
      senderUserId: input.userId,
      fromAddress: sent.from,
      toAddress: conv.contactEmail,
      externalId: sent.messageId,
      messageIdHeader: sent.headerMessageId,
      sentAt: now,
      readAt: now,
    },
  })
  if (rows.length) {
    await prisma.attachment.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { messageId: message.id } })
  }
  await prisma.conversation.update({ where: { id: input.conversationId }, data: { lastMessageAt: now } })
  await writeAudit({ actorUserId: input.userId, action: "message.send", entityType: "Message", entityId: message.id })
  return ok({ id: message.id })
}
