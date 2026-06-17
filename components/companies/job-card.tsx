"use client"

import * as React from "react"
import Link from "next/link"
import { MapPin, Banknote, ExternalLink, CheckCircle2, Wifi } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApplyButton } from "@/components/companies/apply-button"
import { CopyEmail } from "@/components/companies/copy-email"
import { JobDetailModal, type JobDetail } from "@/components/companies/job-detail-modal"
import { formatSalary, relativeTime, SOURCE_LABELS } from "@/lib/format"

export function JobCard({
  job,
  applied,
  gmailConnected,
  fromEmail,
}: {
  job: JobDetail
  applied: boolean
  gmailConnected: boolean
  fromEmail?: string | null
}) {
  const [open, setOpen] = React.useState(false)
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency, job.salaryText)

  // Stop inner controls (links, copy, apply) from also opening the detail modal.
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <>
      <Card
        onClick={() => setOpen(true)}
        className="flex cursor-pointer flex-col gap-3 p-4 transition-shadow hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/companies/${job.company.id}`}
              onClick={stop}
              className="text-sm text-muted-foreground hover:underline"
            >
              {job.company.name}
            </Link>
            <h3 className="font-medium leading-snug tracking-[-0.01em]">{job.title}</h3>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {SOURCE_LABELS[job.source] ?? job.source}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {salary && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-3.5 w-3.5" />
              {salary}
            </span>
          )}
          {job.remote && (
            <span className="inline-flex items-center gap-1">
              <Wifi className="h-3.5 w-3.5" />
              Remote
            </span>
          )}
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
          )}
          <span className="ml-auto">{relativeTime(job.postedAt)}</span>
        </div>

        {job.stack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.stack.slice(0, 6).map((s) => (
              <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Cold-mail address */}
        {job.contactEmail && (
          <div onClick={stop}>
            <CopyEmail email={job.contactEmail} company={job.company.name} role={job.title} />
          </div>
        )}

        <div onClick={stop} className="mt-auto flex items-center justify-between gap-2 pt-1">
          {job.applyUrl ? (
            <Button asChild size="sm" variant="ghost" className="px-2 text-xs">
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                View posting
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
              size="sm"
              variant="outline"
            />
          )}
        </div>
      </Card>

      <JobDetailModal
        job={job}
        open={open}
        onOpenChange={setOpen}
        applied={applied}
        gmailConnected={gmailConnected}
        fromEmail={fromEmail}
      />
    </>
  )
}
