import type { NormalizedJob, SourceResult } from "@/lib/ingest/types"
import { fetchJson, htmlToText, detectStack, parseSalary, extractEmail, truncate } from "@/lib/ingest/util"

type RemotiveJob = {
  id?: number
  url?: string
  title?: string
  company_name?: string
  category?: string
  tags?: string[]
  job_type?: string
  publication_date?: string
  candidate_required_location?: string
  salary?: string
  description?: string
}

export async function fetchRemotive(): Promise<SourceResult> {
  const source = "remotive"
  try {
    const data = await fetchJson<{ jobs: RemotiveJob[] }>(
      "https://remotive.com/api/remote-jobs?category=software-dev&limit=120",
    )
    const jobs: NormalizedJob[] = (data.jobs ?? [])
      .filter((j) => j.id && j.title && j.company_name)
      .map((j) => {
        const desc = htmlToText(j.description)
        const salary = parseSalary(j.salary)
        const stack = (j.tags ?? []).map((t) => t.toLowerCase()).slice(0, 12)
        return {
          source,
          sourceId: String(j.id),
          companyName: j.company_name!.trim(),
          title: j.title!.trim(),
          description: truncate(desc),
          stack: stack.length ? stack : detectStack(`${j.title} ${desc}`),
          employmentType: j.job_type || undefined,
          remote: true,
          location: j.candidate_required_location || "Remote",
          salaryText: j.salary || undefined,
          salaryMin: salary.salaryMin,
          salaryMax: salary.salaryMax,
          currency: salary.currency,
          url: j.url,
          applyUrl: j.url,
          contactEmail: extractEmail(desc),
          postedAt: j.publication_date ? new Date(j.publication_date) : undefined,
        }
      })
    return { source, jobs }
  } catch (err) {
    return { source, jobs: [], error: (err as Error).message }
  }
}
