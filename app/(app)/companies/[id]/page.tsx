import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Globe,
  MapPin,
  Building,
  Users2,
  Briefcase,
  Banknote,
  Wifi,
  ExternalLink,
  CheckCircle2,
  CalendarDays,
} from "lucide-react"
import type { ApplicationStatus } from "@prisma/client"
import { requireUser } from "@/lib/session"
import { isGmailConnected } from "@/lib/google/oauth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ApplyButton } from "@/components/companies/apply-button"
import { CopyEmail } from "@/components/companies/copy-email"
import { formatSalary, relativeTime, SOURCE_LABELS } from "@/lib/format"

export const dynamic = "force-dynamic"

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })

const statusVariant: Record<ApplicationStatus, "default" | "secondary" | "success" | "outline" | "destructive"> = {
  DRAFT: "outline",
  APPLIED: "secondary",
  RESPONDED: "success",
  INTERVIEWING: "default",
  OFFER: "success",
  REJECTED: "destructive",
  CLOSED: "outline",
}

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser()

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      jobPostings: { orderBy: { postedAt: "desc" } },
    },
  })
  if (!company) notFound()

  const application = await prisma.application.findUnique({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
  })

  const gmail = await isGmailConnected(user.id)
  const defaultEmail =
    company.contacts.find((c) => c.email)?.email ??
    company.jobPostings.find((j) => j.contactEmail)?.contactEmail ??
    null

  const meta = [
    company.industry && { icon: Building, text: company.industry },
    company.location && { icon: MapPin, text: company.location },
    company.size && { icon: Users2, text: `${company.size} employees` },
  ].filter(Boolean) as { icon: typeof Building; text: string }[]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/companies" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to discovery
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-medium tracking-[-0.02em]">{company.name}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {meta.map((m, i) => {
              const Icon = m.icon
              return (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {m.text}
                </span>
              )
            })}
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Globe className="h-3.5 w-3.5" />
                Website
              </a>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Discovered {dateFmt.format(company.discoveredAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              {company.jobPostings.length} open {company.jobPostings.length === 1 ? "role" : "roles"}
            </span>
          </div>
        </div>

        <div>
          {application ? (
            <div className="flex flex-col items-start gap-1 rounded-lg border bg-card px-4 py-3 text-sm sm:items-end">
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Applied
              </span>
              <span className="text-muted-foreground">
                <Badge variant={statusVariant[application.status]} className="mr-1">
                  {application.status}
                </Badge>
                {dateFmt.format(application.appliedAt)}
              </span>
            </div>
          ) : (
            <ApplyButton
              companyId={company.id}
              companyName={company.name}
              defaultEmail={defaultEmail}
              gmailConnected={gmail.connected}
              fromEmail={gmail.email}
            />
          )}
        </div>
      </div>

      {/* Contacts (cold-mail) */}
      {company.contacts.some((c) => c.email) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact ({company.contacts.filter((c) => c.email).length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {company.contacts
              .filter((c) => c.email)
              .map((c) => (
                <CopyEmail key={c.id} email={c.email!} company={company.name} role={company.jobPostings[0]?.title ?? "your team"} />
              ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Job openings */}
      <div>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Open roles</h3>
        {company.jobPostings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open roles recorded.</p>
        ) : (
          <div className="space-y-3">
            {company.jobPostings.map((job) => {
              const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency, job.salaryText)
              return (
                <Card key={job.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{job.title}</h4>
                        <Badge variant="outline" className="text-[10px]">
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
                        <span>{relativeTime(job.postedAt)}</span>
                      </div>
                      {job.stack.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {job.stack.slice(0, 8).map((s) => (
                            <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {job.applyUrl && (
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Apply
                      </a>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
