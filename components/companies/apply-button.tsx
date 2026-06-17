"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send, Paperclip, X, Mail, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { applyAndSendAction, applyToCompanyAction, generateBidAction } from "@/app/(app)/companies/actions"

type UploadedAttachment = { id: string; filename: string; size: number }

export function ApplyButton({
  companyId,
  companyName,
  jobPostingId,
  defaultRole,
  defaultEmail,
  gmailConnected,
  fromEmail,
  size = "default",
  variant = "default",
  className,
}: {
  companyId: string
  companyName: string
  jobPostingId?: string
  defaultRole?: string
  defaultEmail?: string | null
  gmailConnected: boolean
  fromEmail?: string | null
  size?: "default" | "sm"
  variant?: "default" | "outline"
  className?: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [to, setTo] = React.useState(defaultEmail ?? "")
  const [subject, setSubject] = React.useState(
    defaultRole ? `Application: ${defaultRole} at ${companyName}` : `Application to ${companyName}`,
  )
  const [body, setBody] = React.useState("")
  const [attachments, setAttachments] = React.useState<UploadedAttachment[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [generating, setGenerating] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  function generateBid() {
    setGenerating(true)
    void (async () => {
      const result = await generateBidAction({ jobPostingId, companyId })
      setGenerating(false)
      if (result.ok) {
        setBody(result.text)
        toast.success("Bid drafted — review and edit before sending")
      } else {
        toast.error(result.error)
      }
    })()
  }

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

  function sendEmail() {
    startTransition(() => {
      void (async () => {
        const result = await applyAndSendAction({
          companyId,
          jobPostingId,
          to,
          subject,
          body,
          attachmentIds: attachments.map((a) => a.id),
        })
        if (result.ok) {
          toast.success(`Application emailed to ${companyName}`)
          setOpen(false)
          if (result.conversationId) router.push(`/inbox?c=${result.conversationId}`)
          else router.refresh()
        } else {
          toast.error(result.error)
        }
      })()
    })
  }

  function justRecord() {
    startTransition(() => {
      void (async () => {
        const result = await applyToCompanyAction({ companyId, jobPostingId, role: defaultRole, channel: "manual" })
        if (result.ok) {
          toast.success(`Recorded application to ${companyName}`)
          setOpen(false)
          router.refresh()
        } else {
          toast.error(result.error)
        }
      })()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className={className} onClick={(e) => e.stopPropagation()}>
          <Send className="h-4 w-4" />
          Apply
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Apply to {companyName}</DialogTitle>
          <DialogDescription>
            {gmailConnected
              ? "Send your application as an email from your Gmail. Replies appear in your Inbox."
              : "Connect Gmail to send applications by email — or just record this application."}
          </DialogDescription>
        </DialogHeader>

        {!gmailConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Gmail not connected</p>
                <p className="text-muted-foreground">Connect once to send and receive email in the portal.</p>
              </div>
              <Button asChild>
                <a href="/api/google/connect">Connect Gmail</a>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={justRecord} disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Just record (no email)
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-[64px_1fr] items-center gap-x-3 gap-y-2 text-sm">
              <span className="text-muted-foreground">From</span>
              <span className="truncate font-mono text-xs text-muted-foreground">{fromEmail}</span>
              <Label htmlFor="to" className="text-muted-foreground">
                To
              </Label>
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="company@example.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="msg">Message</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={generateBid}
                  disabled={generating || isPending}
                  className="h-7 gap-1 text-xs text-primary hover:text-primary"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {generating ? "Generating…" : "Generate with AI"}
                </Button>
              </div>
              <textarea
                id="msg"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={7}
                placeholder="Write your application / pitch… or click Generate with AI"
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
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

            <DialogFooter className="items-center gap-2 sm:justify-between">
              <Button asChild variant="ghost" size="sm" disabled={uploading}>
                <label className="cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  Attach
                  <input type="file" multiple className="hidden" onChange={onFiles} />
                </label>
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button onClick={sendEmail} disabled={isPending || uploading || !to.trim() || !body.trim()}>
                  {isPending && <Loader2 className="animate-spin" />}
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
