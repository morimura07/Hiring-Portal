import { Inbox } from "lucide-react"
import { requireUser } from "@/lib/session"
import { getUserConversations, getConversation, markConversationRead } from "@/lib/inbox"
import { isGmailConnected } from "@/lib/google/oauth"
import { syncConversation } from "@/lib/google/gmail"
import { ConversationList } from "@/components/inbox/conversation-list"
import { MessageThread } from "@/components/inbox/message-thread"
import { InboxSyncButton } from "@/components/inbox/sync-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function InboxPage({ searchParams }: { searchParams: { c?: string } }) {
  const user = await requireUser()
  const activeId = searchParams.c
  const gmail = await isGmailConnected(user.id)

  // Pull fresh replies for the opened thread, then mark it read.
  if (activeId) {
    try {
      await syncConversation(user.id, activeId)
    } catch {
      /* gmail not connected or transient — ignore */
    }
    await markConversationRead(user.id, activeId)
  }

  const [conversations, conversation] = await Promise.all([
    getUserConversations(user.id),
    activeId ? getConversation(user.id, activeId) : Promise.resolve(null),
  ])

  return (
    <div className="flex h-[calc(100vh-7.5rem)] overflow-hidden rounded-xl border bg-card">
      {/* Left: conversation list */}
      <div className={cn("w-full shrink-0 overflow-y-auto border-r md:w-80", conversation && "hidden md:block")}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-medium tracking-[-0.01em]">Inbox</h2>
            <p className="text-xs text-muted-foreground">{conversations.length} conversations</p>
          </div>
          {gmail.connected ? (
            <InboxSyncButton />
          ) : (
            <Button asChild variant="outline" size="sm">
              <a href="/api/google/connect">Connect Gmail</a>
            </Button>
          )}
        </div>
        <ConversationList conversations={conversations} activeId={activeId} />
      </div>

      {/* Right: thread or empty state */}
      <div className={cn("min-w-0 flex-1", !conversation && "hidden md:block")}>
        {conversation ? (
          <MessageThread
            conversationId={conversation.id}
            companyId={conversation.company.id}
            companyName={conversation.company.name}
            role={conversation.application.role}
            status={conversation.application.status}
            messages={conversation.messages}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <Inbox className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">Select a conversation to view the thread.</p>
          </div>
        )}
      </div>
    </div>
  )
}
