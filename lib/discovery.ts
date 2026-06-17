import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type DiscoveryDate = { date: string; count: number }

export const PAGE_SIZE = 24

/** UTC [start, end) range for a YYYY-MM-DD day string. */
export function dayRangeUtc(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export function isValidDateStr(value: string | undefined | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

/** Distinct discovery days (UTC) with job-posting counts, newest first. */
export async function getDiscoveryDates(): Promise<DiscoveryDate[]> {
  const rows = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
    SELECT to_char("discoveredAt", 'YYYY-MM-DD') AS date, COUNT(*) AS count
    FROM job_postings
    GROUP BY to_char("discoveredAt", 'YYYY-MM-DD')
    ORDER BY date DESC
    LIMIT 60
  `
  return rows.map((r) => ({ date: r.date, count: Number(r.count) }))
}

export type JobFilters = {
  date?: string
  q?: string
  source?: string
  hasEmail?: boolean
  hasSalary?: boolean
  remote?: boolean
  page?: number
  sort?: string
  dir?: string
}

export const SORTABLE_FIELDS = ["role", "salary", "email", "posting", "posted", "action"] as const

function buildOrderBy(
  sort: string | undefined,
  dir: string | undefined,
): Prisma.JobPostingOrderByWithRelationInput[] {
  const d: "asc" | "desc" = dir === "asc" ? "asc" : "desc"
  switch (sort) {
    case "role":
      return [{ title: d }]
    case "salary":
      return [{ salaryMax: { sort: d, nulls: "last" } }, { salaryMin: { sort: d, nulls: "last" } }]
    case "email":
      return [{ contactEmail: { sort: d, nulls: "last" } }, { postedAt: "desc" }]
    case "posting":
      return [{ applyUrl: { sort: d, nulls: "last" } }, { postedAt: "desc" }]
    case "posted":
      return [{ postedAt: d }]
    case "action":
      // Sort by applications attached to the posting (applied rows group together).
      return [{ applications: { _count: d } }, { postedAt: "desc" }]
    default:
      // Default: actionable first (email, then salary), newest last.
      return [
        { contactEmail: { sort: "desc", nulls: "last" } },
        { salaryMax: { sort: "desc", nulls: "last" } },
        { postedAt: "desc" },
      ]
  }
}

function buildWhere(filters: JobFilters): Prisma.JobPostingWhereInput {
  const where: Prisma.JobPostingWhereInput = {}
  if (filters.date) {
    const { start, end } = dayRangeUtc(filters.date)
    where.discoveredAt = { gte: start, lt: end }
  }

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { company: { name: { contains: q, mode: "insensitive" } } },
      { stack: { has: q.toLowerCase() } },
    ]
  }
  if (filters.source) where.source = filters.source
  if (filters.hasEmail) where.contactEmail = { not: null }
  if (filters.hasSalary) where.salaryMin = { not: null }
  if (filters.remote) where.remote = true

  return where
}

export async function getJobs(filters: JobFilters) {
  const where = buildWhere(filters)
  const page = Math.max(1, filters.page ?? 1)

  const [total, jobs] = await Promise.all([
    prisma.jobPosting.count({ where }),
    prisma.jobPosting.findMany({
      where,
      orderBy: buildOrderBy(filters.sort, filters.dir),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        company: { select: { id: true, name: true, slug: true, website: true } },
      },
    }),
  ])

  return { jobs, total, page, pageSize: PAGE_SIZE, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

/** Counts across all postings (or a specific date) — for filter hints. */
export async function getDiscoveryStats(date?: string) {
  const base: Prisma.JobPostingWhereInput = date
    ? { discoveredAt: { gte: dayRangeUtc(date).start, lt: dayRangeUtc(date).end } }
    : {}
  const [total, withEmail, withSalary] = await Promise.all([
    prisma.jobPosting.count({ where: base }),
    prisma.jobPosting.count({ where: { ...base, contactEmail: { not: null } } }),
    prisma.jobPosting.count({ where: { ...base, salaryMin: { not: null } } }),
  ])
  return { total, withEmail, withSalary }
}
