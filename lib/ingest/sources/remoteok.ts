import type { NormalizedJob, SourceResult } from "@/lib/ingest/types"
import { fetchJson, htmlToText, detectStack, truncate, isDevRole, extractEmail } from "@/lib/ingest/util"

type RemoteOkJob = {
  id?: string | number
  slug?: string
  company?: string
  position?: string
  tags?: string[]
  location?: string
  salary_min?: number
  salary_max?: number
  url?: string
  apply_url?: string
  date?: string
  description?: string
}

export async function fetchRemoteOk(): Promise<SourceResult> {
  const source = "remoteok"
  try {
    const data = await fetchJson<RemoteOkJob[]>("https://remoteok.com/api")
    // First element is a legal/metadata notice — skip anything without an id+position.
    const jobs: NormalizedJob[] = data
      // RemoteOK returns all categories — keep only developer roles.
      .filter((j) => j && j.id && j.position && j.company && isDevRole(j.position))
      .map((j) => {
        const desc = htmlToText(j.description)
        const stack = (j.tags ?? []).map((t) => t.toLowerCase()).slice(0, 12)
        return {
          source,
          sourceId: String(j.id),
          companyName: j.company!.trim(),
          title: j.position!.trim(),
          description: truncate(desc),
          stack: stack.length ? stack : detectStack(`${j.position} ${desc}`),
          remote: true,
          location: j.location || "Remote",
          salaryMin: j.salary_min || undefined,
          salaryMax: j.salary_max || undefined,
          currency: j.salary_min ? "USD" : undefined,
          url: j.url || (j.slug ? `https://remoteok.com/remote-jobs/${j.slug}` : undefined),
          applyUrl: j.apply_url || j.url,
          contactEmail: extractEmail(desc),
          postedAt: j.date ? new Date(j.date) : undefined,
        }
      })
    return { source, jobs }
  } catch (err) {
    return { source, jobs: [], error: (err as Error).message }
  }
}
