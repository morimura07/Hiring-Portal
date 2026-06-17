import crypto from "crypto"
import MailComposer from "nodemailer/lib/mail-composer"
import { prisma } from "@/lib/prisma"
import { htmlToText } from "@/lib/ingest/util"
import { saveAttachment } from "@/lib/storage"
import { getValidAccessToken, getGoogleAccount } from "@/lib/google/oauth"

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"

// ---------- Sending ----------

export type OutgoingAttachment = { filename: string; content: Buffer; contentType?: string }

function buildRawMessage(options: Record<string, unknown>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    new MailComposer(options).compile().build((err: Error | null, message: Buffer) => {
      if (err) reject(err)
      else resolve(message)
    })
  })
}

export async function sendGmail(
  userId: string,
  params: {
    to: string
    subject: string
    text: string
    html?: string
    attachments?: OutgoingAttachment[]
    threadId?: string
    inReplyTo?: string
    references?: string
  },
): Promise<{ messageId: string; threadId: string; headerMessageId: string; from: string }> {
  const token = await getValidAccessToken(userId)
  if (!token) throw new Error("Gmail is not connected.")
  const acct = await getGoogleAccount(userId)
  if (!acct) throw new Error("Gmail is not connected.")

  const headerMessageId = `<${crypto.randomUUID()}@hiring-portal>`
  const raw = await buildRawMessage({
    from: acct.email,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
    inReplyTo: params.inReplyTo,
    references: params.references,
    messageId: headerMessageId,
  })

  const res = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      raw: raw.toString("base64url"),
      ...(params.threadId ? { threadId: params.threadId } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Gmail send failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { id: string; threadId: string }
  return { messageId: data.id, threadId: data.threadId, headerMessageId, from: acct.email }
}

// ---------- Receiving / sync ----------

type GmailHeader = { name: string; value: string }
type GmailPart = {
  mimeType?: string
  filename?: string
  headers?: GmailHeader[]
  body?: { data?: string; attachmentId?: string; size?: number }
  parts?: GmailPart[]
}
type GmailMessage = {
  id: string
  threadId: string
  internalDate?: string
  labelIds?: string[]
  payload: GmailPart & { headers: GmailHeader[] }
}

function headerValue(headers: GmailHeader[], name: string): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value
}

function decodeData(data?: string): string {
  return data ? Buffer.from(data, "base64url").toString("utf8") : ""
}

function extractBody(payload: GmailPart): string {
  let text = ""
  let html = ""
  const walk = (p?: GmailPart) => {
    if (!p) return
    if (p.mimeType === "text/plain" && p.body?.data) text ||= decodeData(p.body.data)
    else if (p.mimeType === "text/html" && p.body?.data) html ||= decodeData(p.body.data)
    p.parts?.forEach(walk)
  }
  walk(payload)
  return (text || htmlToText(html)).trim()
}

function extractAttachmentParts(payload: GmailPart): { filename: string; mimeType: string; attachmentId: string; size: number }[] {
  const out: { filename: string; mimeType: string; attachmentId: string; size: number }[] = []
  const walk = (p?: GmailPart) => {
    if (!p) return
    if (p.filename && p.body?.attachmentId) {
      out.push({
        filename: p.filename,
        mimeType: p.mimeType ?? "application/octet-stream",
        attachmentId: p.body.attachmentId,
        size: p.body.size ?? 0,
      })
    }
    p.parts?.forEach(walk)
  }
  walk(payload)
  return out
}

async function gmailGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${GMAIL_API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Gmail API ${path} failed: ${res.status}`)
  return res.json()
}

/**
 * Pull new messages for one conversation's Gmail thread into the DB.
 * Returns the number of newly imported messages.
 */
export async function syncConversation(userId: string, conversationId: string): Promise<number> {
  const token = await getValidAccessToken(userId)
  if (!token) return 0
  const acct = await getGoogleAccount(userId)
  if (!acct) return 0

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, application: { userId } },
    select: { id: true, gmailThreadId: true },
  })
  if (!conversation?.gmailThreadId) return 0

  const thread = await gmailGet<{ messages: GmailMessage[] }>(
    token,
    `/threads/${conversation.gmailThreadId}?format=full`,
  )

  const existing = await prisma.message.findMany({
    where: { conversationId: conversation.id, externalId: { not: null } },
    select: { externalId: true },
  })
  const seen = new Set(existing.map((m) => m.externalId))
  const myEmail = acct.email.toLowerCase()

  let imported = 0
  let latest: Date | null = null

  for (const msg of thread.messages ?? []) {
    if (seen.has(msg.id)) continue
    const headers = msg.payload.headers ?? []
    const from = headerValue(headers, "From") ?? ""
    const to = headerValue(headers, "To") ?? ""
    const subject = headerValue(headers, "Subject")
    const messageIdHeader = headerValue(headers, "Message-ID")
    const direction = from.toLowerCase().includes(myEmail) ? "OUTBOUND" : "INBOUND"
    const sentAt = msg.internalDate ? new Date(Number(msg.internalDate)) : new Date()

    const created = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction,
        subject: subject ?? null,
        body: extractBody(msg.payload) || "(no text content)",
        senderUserId: direction === "OUTBOUND" ? userId : null,
        fromAddress: from,
        toAddress: to,
        externalId: msg.id,
        messageIdHeader: messageIdHeader ?? null,
        sentAt,
        // Inbound replies start unread; outbound are read.
        readAt: direction === "OUTBOUND" ? new Date() : null,
      },
    })

    // Download + store attachments.
    for (const att of extractAttachmentParts(msg.payload)) {
      try {
        const data = await gmailGet<{ data: string }>(
          token,
          `/messages/${msg.id}/attachments/${att.attachmentId}`,
        )
        const buf = Buffer.from(data.data, "base64url")
        const id = crypto.randomUUID()
        const storagePath = await saveAttachment(id, att.filename, buf)
        await prisma.attachment.create({
          data: { id, messageId: created.id, filename: att.filename, mimeType: att.mimeType, size: buf.length, storagePath },
        })
      } catch (err) {
        console.error("[gmail] attachment download failed:", err)
      }
    }

    imported++
    if (!latest || sentAt > latest) latest = sentAt
  }

  if (latest) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: latest } })
  }
  return imported
}

/** Sync every tracked thread for the user. Returns total newly imported messages. */
export async function syncUserInbox(userId: string): Promise<number> {
  const conversations = await prisma.conversation.findMany({
    where: { application: { userId }, gmailThreadId: { not: null } },
    select: { id: true },
  })
  let total = 0
  for (const c of conversations) {
    try {
      total += await syncConversation(userId, c.id)
    } catch (err) {
      console.error("[gmail] sync failed for conversation", c.id, err)
    }
  }
  return total
}
