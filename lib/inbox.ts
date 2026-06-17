import type { MessageDirection } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { writeAudit } from "@/lib/audit"

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }
const ok = <T>(data: T): Result<T> => ({ ok: true, data })
const fail = (error: string): Result<never> => ({ ok: false, error })

/** Conversations belong to the user via their application. List for the left panel. */
export async function getUserConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { application: { userId } },
    orderBy: { lastMessageAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
      messages: { orderBy: { sentAt: "desc" }, take: 1 },
    },
  })

  // Unread = inbound messages not yet read, per conversation.
  const unreadRows = await prisma.message.groupBy({
    by: ["conversationId"],
    where: { direction: "INBOUND", readAt: null, conversation: { application: { userId } } },
    _count: { _all: true },
  })
  const unread = new Map(unreadRows.map((r) => [r.conversationId, r._count._all]))

  return conversations.map((c) => ({
    id: c.id,
    companyId: c.company.id,
    companyName: c.company.name,
    subject: c.subject,
    lastMessageAt: c.lastMessageAt,
    lastMessage: c.messages[0]
      ? { body: c.messages[0].body, direction: c.messages[0].direction, sentAt: c.messages[0].sentAt }
      : null,
    unread: unread.get(c.id) ?? 0,
  }))
}

/** Full thread, only if the conversation belongs to the user. */
export async function getConversation(userId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, application: { userId } },
    include: {
      company: { select: { id: true, name: true } },
      application: { select: { id: true, role: true, status: true } },
      messages: {
        orderBy: { sentAt: "asc" },
        include: {
          senderUser: { select: { id: true, name: true, avatarUrl: true } },
          attachments: { select: { id: true, filename: true, size: true } },
        },
      },
    },
  })
}

async function ownsConversation(userId: string, conversationId: string): Promise<boolean> {
  const c = await prisma.conversation.findFirst({
    where: { id: conversationId, application: { userId } },
    select: { id: true },
  })
  return Boolean(c)
}

export async function sendMessage(input: {
  actorId: string
  conversationId: string
  body: string
  direction: MessageDirection
  attachmentIds?: string[]
}): Promise<Result<{ id: string }>> {
  const body = input.body.trim()
  if (!body) return fail("Message can't be empty.")
  if (!(await ownsConversation(input.actorId, input.conversationId))) {
    return fail("This isn't your conversation.")
  }

  const now = new Date()
  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      direction: input.direction,
      body,
      senderUserId: input.direction === "OUTBOUND" ? input.actorId : null,
      // Inbound messages we log ourselves are already "seen".
      readAt: now,
      sentAt: now,
    },
  })
  if (input.attachmentIds?.length) {
    await prisma.attachment.updateMany({
      where: { id: { in: input.attachmentIds }, messageId: null },
      data: { messageId: message.id },
    })
  }
  await prisma.conversation.update({ where: { id: input.conversationId }, data: { lastMessageAt: now } })

  await writeAudit({
    actorUserId: input.actorId,
    action: input.direction === "OUTBOUND" ? "message.send" : "message.log_reply",
    entityType: "Message",
    entityId: message.id,
    metadata: { conversationId: input.conversationId },
  })
  return ok({ id: message.id })
}

/** Mark inbound messages in a conversation as read (owner only). */
export async function markConversationRead(userId: string, conversationId: string): Promise<void> {
  if (!(await ownsConversation(userId, conversationId))) return
  await prisma.message.updateMany({
    where: { conversationId, direction: "INBOUND", readAt: null },
    data: { readAt: new Date() },
  })
}
