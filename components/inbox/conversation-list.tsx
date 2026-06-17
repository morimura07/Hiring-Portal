import Link from "next/link"
import { Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { relativeTime } from "@/lib/format"

export type ConversationListItem = {
  id: string
  companyName: string
  subject: string | null
  lastMessageAt: Date
  lastMessage: { body: string; direction: string; sentAt: Date } | null
  unread: number
}

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
}

export function ConversationList({
  conversations,
  activeId,
}: {
  conversations: ConversationListItem[]
  activeId?: string
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <Inbox className="mb-2 h-6 w-6 opacity-50" />
        No conversations yet.
        <span className="mt-1">Apply to a company to start a thread.</span>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {conversations.map((c) => {
        const active = c.id === activeId
        const preview = c.lastMessage
          ? `${c.lastMessage.direction === "OUTBOUND" ? "You: " : ""}${c.lastMessage.body}`
          : "No messages yet"
        return (
          <Link
            key={c.id}
            href={`/inbox?c=${c.id}`}
            className={cn(
              "flex items-center gap-3 px-3 py-3 transition-colors hover:bg-accent/60",
              active && "bg-accent",
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {initials(c.companyName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{c.companyName}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {relativeTime(c.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{preview}</span>
                {c.unread > 0 && (
                  <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {c.unread}
                  </span>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
