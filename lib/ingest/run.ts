import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { writeAudit } from "@/lib/audit"
import { slugify, cleanCompanyName, jobDedupeKey } from "@/lib/ingest/util"
import type { NormalizedJob, IngestSummary, SourceResult } from "@/lib/ingest/types"
import { fetchHackerNews } from "@/lib/ingest/sources/hackernews"
import { fetchRemoteOk } from "@/lib/ingest/sources/remoteok"
import { fetchRemotive } from "@/lib/ingest/sources/remotive"
import { fetchGreenhouse } from "@/lib/ingest/sources/greenhouse"
import { fetchLever } from "@/lib/ingest/sources/lever"

export const ALL_SOURCES = ["hn_whoishiring", "remoteok", "remotive", "greenhouse", "lever"] as const
export type SourceKey = (typeof ALL_SOURCES)[number]

const FETCHERS: Record<SourceKey, () => Promise<SourceResult>> = {
  hn_whoishiring: fetchHackerNews,
  remoteok: fetchRemoteOk,
  remotive: fetchRemotive,
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
}

/** Run async fn over items with bounded concurrency. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker))
  return results
}

/** Remove duplicate postings that share a dedupeKey, keeping the most recent. */
async function collapseDuplicates(): Promise<number> {
  const dups = await prisma.$queryRaw<{ dedupeKey: string }[]>`
    SELECT "dedupeKey" FROM job_postings
    WHERE "dedupeKey" IS NOT NULL
    GROUP BY "dedupeKey" HAVING COUNT(*) > 1
  `
  let removed = 0
  for (const { dedupeKey } of dups) {
    const rows = await prisma.jobPosting.findMany({
      where: { dedupeKey },
      orderBy: { postedAt: "desc" },
      select: { id: true },
    })
    const toDelete = rows.slice(1).map((r) => r.id)
    if (toDelete.length) {
      await prisma.jobPosting.deleteMany({ where: { id: { in: toDelete } } })
      removed += toDelete.length
    }
  }
  return removed
}

export async function runIngest(options?: {
  sources?: SourceKey[]
  actorUserId?: string | null
}): Promise<IngestSummary> {
  const sources = options?.sources?.length ? options.sources : [...ALL_SOURCES]
  const now = new Date()

  // 1. Fetch all sources in parallel. Keep ONLY postings with a contact email.
  const results = await Promise.all(sources.map((s) => FETCHERS[s]()))
  const bySource = results.map((r) => ({
    source: r.source,
    fetched: r.jobs.filter((j) => j.contactEmail).length,
    error: r.error,
  }))
  const allJobs = results.flatMap((r) => r.jobs).filter((j) => j.contactEmail)

  // 2. Upsert unique companies (distinct slugs → no same-slug race).
  const companyBySlug = new Map<string, { name: string; job: NormalizedJob }>()
  for (const job of allJobs) {
    const name = cleanCompanyName(job.companyName)
    const slug = slugify(name)
    if (!companyBySlug.has(slug)) companyBySlug.set(slug, { name, job })
  }
  const slugToId = new Map<string, string>()
  await pool([...companyBySlug.entries()], 8, async ([slug, { name, job }]) => {
    const company = await prisma.company.upsert({
      where: { slug },
      update: { name, website: job.companyWebsite ?? undefined, domain: job.companyDomain ?? undefined },
      create: {
        slug,
        name,
        website: job.companyWebsite ?? null,
        domain: job.companyDomain ?? null,
        discoveredAt: now,
      },
    })
    slugToId.set(slug, company.id)
  })

  // 3. Insert/refresh postings, de-duplicated by (company + normalized role).
  const existing = await prisma.jobPosting.findMany({
    select: { source: true, sourceId: true, dedupeKey: true },
  })
  const existingSourceKeys = new Set(existing.map((j) => `${j.source} ${j.sourceId}`))
  const seenDedupe = new Set(existing.map((j) => j.dedupeKey).filter((k): k is string => Boolean(k)))

  // Collapse duplicates within this batch — prefer a posting that already exists
  // (so we refresh it), otherwise the most recently posted.
  type Enriched = NormalizedJob & { _exact: string; _dk: string; _companyId: string }
  const byDedupe = new Map<string, Enriched>()
  for (const job of allJobs) {
    const companyId = slugToId.get(slugify(cleanCompanyName(job.companyName)))
    if (!companyId) continue
    const e: Enriched = {
      ...job,
      _companyId: companyId,
      _exact: `${job.source} ${job.sourceId}`,
      _dk: jobDedupeKey(cleanCompanyName(job.companyName), job.title),
    }
    const prev = byDedupe.get(e._dk)
    if (!prev) {
      byDedupe.set(e._dk, e)
      continue
    }
    const prevExists = existingSourceKeys.has(prev._exact)
    const curExists = existingSourceKeys.has(e._exact)
    if (curExists && !prevExists) byDedupe.set(e._dk, e)
    else if (curExists === prevExists && (e.postedAt?.getTime() ?? 0) > (prev.postedAt?.getTime() ?? 0)) {
      byDedupe.set(e._dk, e)
    }
  }

  let jobsCreated = 0
  let jobsUpdated = 0
  let jobsSkipped = 0
  await pool([...byDedupe.values()], 8, async (job) => {
    const data: Prisma.JobPostingUncheckedCreateInput = {
      companyId: job._companyId,
      title: job.title,
      description: job.description ?? null,
      stack: job.stack ?? [],
      employmentType: job.employmentType ?? null,
      remote: job.remote ?? false,
      location: job.location ?? null,
      salaryText: job.salaryText ?? null,
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      currency: job.currency ?? null,
      url: job.url ?? null,
      applyUrl: job.applyUrl ?? null,
      contactEmail: job.contactEmail ?? null,
      source: job.source,
      sourceId: job.sourceId,
      dedupeKey: job._dk,
      postedAt: job.postedAt ?? now,
    }

    if (existingSourceKeys.has(job._exact)) {
      await prisma.jobPosting.update({
        where: { source_sourceId: { source: job.source, sourceId: job.sourceId } },
        data,
      })
      jobsUpdated++
    } else if (seenDedupe.has(job._dk)) {
      jobsSkipped++ // a different posting already covers this company + role
    } else {
      await prisma.jobPosting.create({ data })
      jobsCreated++
    }
  })

  // Safety net: collapse any remaining duplicate dedupeKeys.
  const duplicatesRemoved = await collapseDuplicates()

  // 4. Upsert contacts for jobs that carry an email.
  let contacts = 0
  const seenContact = new Set<string>()
  await pool(allJobs, 8, async (job) => {
    const companyId = slugToId.get(slugify(cleanCompanyName(job.companyName)))
    const email = job.contactEmail!.toLowerCase()
    const key = `${companyId}:${email}`
    if (!companyId || seenContact.has(key)) return
    seenContact.add(key)
    const existingContact = await prisma.contact.findFirst({ where: { companyId, email } })
    if (!existingContact) {
      await prisma.contact.create({
        data: { companyId, name: email.split("@")[0], email, isPrimary: true },
      })
      contacts++
    }
  })

  const summary: IngestSummary = {
    bySource,
    companies: companyBySlug.size,
    jobsCreated,
    jobsUpdated,
    jobsSkipped,
    duplicatesRemoved,
    contacts,
    withEmail: allJobs.filter((j) => j.contactEmail).length,
    withSalary: allJobs.filter((j) => j.salaryMin).length,
  }

  await writeAudit({
    actorUserId: options?.actorUserId ?? null,
    action: "ingest.run",
    entityType: "JobPosting",
    metadata: summary as unknown as Prisma.InputJsonValue,
  })

  return summary
}
