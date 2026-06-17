"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Send, Loader2, Paperclip, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { sendMessageAction } from "@/app/(app)/inbox/actions"

type UploadedAttachment = { id: string; filename: string; size: number }

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter()
  const [direction, setDirection] = React.useState<"OUTBOUND" | "INBOUND">("OUTBOUND")
  const [body, setBody] = React.useState("")
  const [attachments, setAttachments] = React.useState<UploadedAttachment[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append("files", f))
      const res = await fetch("/api/attachments", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Upload failed")
      setAttachments((prev) => [...prev, ...data.attachments])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  function submit() {
    const text = body.trim()
    if (!text) return
    startTransition(() => {
      void (async () => {
        const result = await sendMessageAction({
          conversationId,
          body: text,
          direction,
          attachmentIds: attachments.map((a) => a.id),
        })
        if (result.ok) {
          setBody("")
          setAttachments([])
          router.refresh()
        } else {
          toast.error(result.error)
        }
      })()
    })
  }

  // Multi-line composing: Enter inserts a newline; Ctrl/Cmd+Enter sends.
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t bg-background p-3">
      <div className="mb-2 flex items-center gap-1 text-xs">
        {(["OUTBOUND", "INBOUND"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            className={cn(
              "rounded-full px-2.5 py-1 transition-colors",
              direction === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {d === "OUTBOUND" ? "You sent" : "They replied"}
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        rows={8}
        placeholder={direction === "OUTBOUND" ? "Write a message you sent…" : "Paste the reply you received…"}
        className="min-h-[180px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs">
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[160px] truncate">{a.filename}</span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" disabled={uploading} className="text-xs">
            <label className="cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              Attach
              <input type="file" multiple className="hidden" onChange={onFiles} />
            </label>
          </Button>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            <kbd className="rounded border bg-muted px-1 font-mono">Ctrl</kbd>/
            <kbd className="rounded border bg-muted px-1 font-mono">⌘</kbd> +{" "}
            <kbd className="rounded border bg-muted px-1 font-mono">Enter</kbd> to send
          </span>
        </div>
        <Button onClick={submit} disabled={isPending || uploading || !body.trim()}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </div>
    </div>
  )
}
