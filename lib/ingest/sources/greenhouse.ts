import type { NormalizedJob, SourceResult } from "@/lib/ingest/types"
import { fetchJson, htmlToText, detectStack, detectRemote, parseSalary, isDevRole, truncate, extractEmail, settledLimit } from "@/lib/ingest/util"
import { greenhouseBoards, type Board } from "@/lib/ingest/boards"

type GhJob = {
  id: number
  title: string
  absolute_url: string
  updated_at?: string
  location?: { name?: string }
  content?: string
}

async function fetchBoard(board: Board): Promise<NormalizedJob[]> {
  const data = await fetchJson<{ jobs: GhJob[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`,
  )
  return (data.jobs ?? [])
    .filter((j) => j.title && isDevRole(j.title))
    .map((j) => {
      const desc = htmlToText(j.content)
      const salary = parseSalary(desc)
      const location = j.location?.name
      return {
        source: "greenhouse",
        sourceId: `${board.token}-${j.id}`,
        companyName: board.name,
        title: j.title.trim(),
        description: truncate(desc),
        stack: detectStack(`${j.title} ${desc}`),
        remote: detectRemote(location, desc),
        location: location || undefined,
        salaryMin: salary.salaryMin,
        salaryMax: salary.salaryMax,
        currency: salary.currency,
        url: j.absolute_url,
        applyUrl: j.absolute_url,
        contactEmail: extractEmail(desc),
        postedAt: j.updated_at ? new Date(j.updated_at) : undefined,
      }
    })
}

export async function fetchGreenhouse(): Promise<SourceResult> {
  const source = "greenhouse"
  const boards = greenhouseBoards()
  const jobs: NormalizedJob[] = []
  let errors = 0
  const results = await settledLimit(boards, 8, fetchBoard)
  for (const r of results) {
    if (r.status === "fulfilled") jobs.push(...r.value)
    else errors++
  }
  return {
    source,
    jobs,
    error: errors === boards.length && boards.length > 0 ? "all greenhouse boards failed" : undefined,
  }
}
