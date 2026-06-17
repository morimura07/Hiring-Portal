import type { ApplicationStatus } from "@prisma/client"
import { requireUser } from "@/lib/session"
import { getUserApplications, getUserStatusCounts } from "@/lib/applications"
import { APPLICATION_STATUSES } from "@/lib/format"
import { ApplicationsTable, type ApplicationRow } from "@/components/applications/applications-table"

export const dynamic = "force-dynamic"

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const user = await requireUser()

  const status = (APPLICATION_STATUSES as readonly string[]).includes(searchParams.status ?? "")
    ? (searchParams.status as ApplicationStatus)
    : undefined

  const [apps, counts] = await Promise.all([
    getUserApplications(user.id, status),
    getUserStatusCounts(user.id),
  ])

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  const rows: ApplicationRow[] = apps.map((a) => ({
    id: a.id,
    companyId: a.companyId,
    companyName: a.company.name,
    contactEmail: a.company.contacts[0]?.email ?? null,
    role: a.role ?? a.jobPosting?.title ?? null,
    status: a.status,
    channel: a.channel,
    appliedAt: a.appliedAt.toISOString(),
    conversations: a._count.conversations,
  }))

  return <ApplicationsTable applications={rows} counts={counts} total={total} activeStatus={status} />
}
