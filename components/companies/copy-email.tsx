"use client"

import * as React from "react"
import { Copy, Check, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function CopyEmail({
  email,
  company,
  role,
}: {
  email: string
  company: string
  role: string
}) {
  const [copied, setCopied] = React.useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      toast.success("Email copied")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy")
    }
  }

  const subject = encodeURIComponent(`${role} — interested in joining ${company}`)
  const body = encodeURIComponent(
    `Hi ${company} team,\n\nI came across your "${role}" opening and I'm very interested. ` +
      `I'd love to share how I can contribute.\n\nBest,\n`,
  )

  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1">
      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate font-mono text-xs" title={email}>
        {email}
      </span>
      <button
        onClick={copy}
        className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Copy email"
        aria-label="Copy email"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-xs">
        <a href={`mailto:${email}?subject=${subject}&body=${body}`}>Draft</a>
      </Button>
    </div>
  )
}
