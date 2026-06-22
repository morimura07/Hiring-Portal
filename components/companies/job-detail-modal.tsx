"use client"

import Link from "next/link"
import {
  Banknote,
  Wifi,
  MapPin,
  CalendarDays,
  ExternalLink,
  Briefcase,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import * as React from "react"
import { CopyEmail } from "@/components/companies/copy-email"
import { ApplyButton } from "@/components/companies/apply-button"
import { formatSalary, relativeTime, SOURCE_LABELS } from "@/lib/format"

const URL_RE = /(https?:\/\/[^\s<>()]+)/g

/** Render a description as paragraphs with clickable URLs. */
function renderDescription(text: string): React.ReactNode {
  return text.split(/\n{2,}/).map((para, pi) => (
    <p key={pi} className="mb-3 whitespace-pre-line last:mb-0">
      {para.split(URL_RE).map((seg, si) =>
        /^https?:\/\//.test(seg) ? (
          <a
            key={si}
            href={seg.replace(/[.,;:]+$/, "")}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline underline-offset-2 hover:opacity-80"
          >
            {seg}
          </a>
        ) : (
          <React.Fragment key={si}>{seg}</React.Fragment>
        ),
      )}
    </p>
  ))
}

export type JobDetail = {
  id: string
  title: string
  description: string | null
  stack: string[]
  remote: boolean
  location: string | null
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryText: string | null
  currency: string | null
  url: string | null
  applyUrl: string | null
  contactEmail: string | null
  source: string
  postedAt: Date
  companyId: string
  company: { id: string; name: string }
}

export function JobDetailModal({
  job,
  open,
  onOpenChange,
  applied,
  gmailConnected,
  fromEmail,
}: {
  job: JobDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  applied: boolean
  gmailConnected: boolean
  fromEmail?: string | null
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency, job.salaryText)
  const [descCopied, setDescCopied] = React.useState(false)

  async function copyDescription() {
    if (!job.description) return
    try {
      await navigator.clipboard.writeText(job.description)
      setDescCopied(true)
      toast.success("Job description copied")
      setTimeout(() => setDescCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Link
              href={`/companies/${job.company.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {job.company.name}
            </Link>
            <Badge variant="outline" className="text-[10px]">
              {SOURCE_LABELS[job.source] ?? job.source}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{job.title}</DialogTitle>
        </DialogHeader>

        {/* Metrics */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {salary && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-4 w-4" />
              {salary}
            </span>
          )}
          {job.remote && (
            <span className="inline-flex items-center gap-1">
              <Wifi className="h-4 w-4" />
              Remote
            </span>
          )}
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {job.location}
            </span>
          )}
          {job.employmentType && (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {job.employmentType}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            {relativeTime(job.postedAt)}
          </span>
        </div>

        {job.stack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.stack.map((s) => (
              <span key={s} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Contact email */}
        {job.contactEmail && (
          <CopyEmail email={job.contactEmail} company={job.company.name} role={job.title} />
        )}

        {/* Job description (from the database) */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Job description
            </h4>
            {job.description && (
              <button
                onClick={copyDescription}
                className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Copy job description"
                aria-label="Copy job description"
              >
                {descCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {descCopied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          {job.description ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-7 text-foreground/90">
              {renderDescription(job.description)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No description captured for this posting.</p>
          )}
        </div>

        {/* Footer: original posting + apply */}
        <div className="flex items-center justify-between gap-2 border-t pt-4">
          {job.applyUrl ? (
            <Button asChild variant="ghost" size="sm">
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                View original posting
              </a>
            </Button>
          ) : (
            <span />
          )}

          {applied ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Applied
            </Badge>
          ) : (
            <ApplyButton
              companyId={job.company.id}
              companyName={job.company.name}
              jobPostingId={job.id}
              defaultRole={job.title}
              defaultEmail={job.contactEmail}
              gmailConnected={gmailConnected}
              fromEmail={fromEmail}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
