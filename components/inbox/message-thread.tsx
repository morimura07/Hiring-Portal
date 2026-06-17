import Link from "next/link"
import { ArrowLeft, Building2, Paperclip } from "lucide-react"
import type { MessageDirection } from "@prisma/client"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { STATUS_LABELS, STATUS_VARIANT } from "@/lib/format"
import { avatarSrc } from "@/lib/avatar"
import { MessageComposer } from "@/components/inbox/message-composer"

type ThreadMessage = {
  id: string
  direction: MessageDirection
  body: string
  sentAt: Date
  senderUser: { id: string; name: string | null; avatarUrl: string | null } | null
  attachments: { id: string; filename: string; size: number }[]
}

function initials(text: string) {
  return text.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const timeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })

export function MessageThread({
  conversationId,
  companyId,
  companyName,
  role,
  status,
  messages,
}: {
  conversationId: string
  companyId: string
  companyName: string
  role: string | null
  status: string
  messages: ThreadMessage[]
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link href="/inbox" className="rounded-md p-1 hover:bg-accent md:hidden">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{companyName}</span>
            <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className="text-[10px]">
              {STATUS_LABELS[status] ?? status}
            </Badge>
          </div>
          {role && <span className="text-xs text-muted-foreground">{role}</span>}
        </div>
        <Link
          href={`/companies/${companyId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Building2 className="h-3.5 w-3.5" />
          Company
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet. Log your outreach below.
          </p>
        )}
        {messages.map((m) => {
          const outbound = m.direction === "OUTBOUND"
          const avatar = outbound ? (
            <Avatar className="h-7 w-7 shrink-0">
              {m.senderUser && avatarSrc(m.senderUser) && <AvatarImage src={avatarSrc(m.senderUser)!} />}
              <AvatarFallback className="text-[10px]">{initials(m.senderUser?.name ?? "You")}</AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-muted text-[10px]">{initials(companyName)}</AvatarFallback>
            </Avatar>
          )
          return (
            <div key={m.id} className={cn("flex items-end gap-2", outbound ? "justify-end" : "justify-start")}>
              {!outbound && avatar}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                  outbound
                    ? "rounded-br-sm bg-[#004FE5] text-white"
                    : "rounded-bl-sm bg-muted text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {m.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.attachments.map((a) => (
                      <a
                        key={a.id}
                        href={`/api/attachments?id=${a.id}`}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                          outbound ? "bg-white/15 hover:bg-white/25" : "bg-background hover:bg-accent",
                        )}
                      >
                        <Paperclip className="h-3 w-3 shrink-0" />
                        <span className="max-w-[180px] truncate">{a.filename}</span>
                        <span className={cn("ml-auto shrink-0", outbound ? "text-white/60" : "text-muted-foreground")}>
                          {formatSize(a.size)}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                <div className={cn("mt-1 text-[10px]", outbound ? "text-white/60" : "text-muted-foreground")}>
                  {outbound ? m.senderUser?.name ?? "You" : "Them"} · {timeFmt.format(m.sentAt)}
                </div>
              </div>
              {outbound && avatar}
            </div>
          )
        })}
      </div>

      <MessageComposer conversationId={conversationId} />
    </div>
  )
}
