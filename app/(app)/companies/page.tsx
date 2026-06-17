import Link from "next/link"
import { Briefcase, ChevronLeft, ChevronRight } from "lucide-react"
import { requireUser } from "@/lib/session"
import { getDiscoveryStats, getJobs, type JobFilters } from "@/lib/discovery"
import { getAppliedCompanyIds } from "@/lib/applications"
import { isGmailConnected } from "@/lib/google/oauth"
import { DiscoveryFilters } from "@/components/companies/discovery-filters"
import { JobCard } from "@/components/companies/job-card"
import { SortSelect } from "@/components/companies/sort-select"
import { SyncButton } from "@/components/companies/sync-button"

export const dynamic = "force-dynamic"

type SP = {
  q?: string
  source?: string
  hasEmail?: string
  hasSalary?: string
  remote?: string
  page?: string
  sort?: string
  dir?: string
}

function buildQuery(sp: SP, patch: Partial<Record<keyof SP, string>>): string {
  const merged = { ...sp, ...patch }
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v)
  return params.toString()
}

export default async function CompaniesPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser()

  const filters: JobFilters = {
    q: searchParams.q,
    source: searchParams.source,
    hasEmail: searchParams.hasEmail === "1",
    hasSalary: searchParams.hasSalary === "1",
    remote: searchParams.remote === "1",
    page: searchParams.page ? parseInt(searchParams.page, 10) : 1,
    sort: searchParams.sort,
    dir: searchParams.dir,
  }

  const [stats, result, gmail] = await Promise.all([
    getDiscoveryStats(),
    getJobs(filters),
    isGmailConnected(user.id),
  ])
  const appliedIds = await getAppliedCompanyIds(
    user.id,
    result.jobs.map((j) => j.companyId),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.01em]">Discovery</h2>
          <p className="text-sm text-muted-foreground">
            {stats.total.toLocaleString()} dev roles with a contact email · {stats.withSalary} with salary
          </p>
        </div>
        {user.role === "ADMIN" && <SyncButton />}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1">
          <DiscoveryFilters stats={stats} />
        </div>
        <SortSelect />
      </div>

      {result.jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium">No roles match</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Try a different date, clear filters, or run a sync to pull fresh postings.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                applied={appliedIds.has(job.companyId)}
                gmailConnected={gmail.connected}
                fromEmail={gmail.email}
              />
            ))}
          </div>

          {result.pageCount > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <Link
                href={`/companies?${buildQuery(searchParams, { page: String(result.page - 1) })}`}
                aria-disabled={result.page <= 1}
                className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
                  result.page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-accent"
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Link>
              <span className="text-sm text-muted-foreground">
                Page {result.page} of {result.pageCount}
              </span>
              <Link
                href={`/companies?${buildQuery(searchParams, { page: String(result.page + 1) })}`}
                aria-disabled={result.page >= result.pageCount}
                className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
                  result.page >= result.pageCount ? "pointer-events-none opacity-40" : "hover:bg-accent"
                }`}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
