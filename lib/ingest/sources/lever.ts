import type { NormalizedJob, SourceResult } from "@/lib/ingest/types"
import { fetchJson, htmlToText, detectStack, detectRemote, parseSalary, isDevRole, truncate, extractEmail, settledLimit } from "@/lib/ingest/util"
import { leverBoards, type Board } from "@/lib/ingest/boards"

type LeverPosting = {
  id: string
  text: string
  categories?: { commitment?: string; location?: string; team?: string }
  hostedUrl?: string
  applyUrl?: string
  descriptionPlain?: string
  description?: string
  createdAt?: number
  workplaceType?: string
}

async function fetchBoard(board: Board): Promise<NormalizedJob[]> {
  const data = await fetchJson<LeverPosting[]>(
    `https://api.lever.co/v0/postings/${board.token}?mode=json`,
  )
  return (data ?? [])
    .filter((p) => p.text && isDevRole(p.text))
    .map((p) => {
      const desc = p.descriptionPlain || htmlToText(p.description)
      const salary = parseSalary(desc)
      const location = p.categories?.location
      return {
        source: "lever",
        sourceId: `${board.token}-${p.id}`,
        companyName: board.name,
        title: p.text.trim(),
        description: truncate(desc),
        stack: detectStack(`${p.text} ${desc}`),
        employmentType: p.categories?.commitment,
        remote: detectRemote(p.workplaceType, location, desc),
        location: location || undefined,
        salaryMin: salary.salaryMin,
        salaryMax: salary.salaryMax,
        currency: salary.currency,
        url: p.hostedUrl,
        applyUrl: p.applyUrl || p.hostedUrl,
        contactEmail: extractEmail(desc),
        postedAt: p.createdAt ? new Date(p.createdAt) : undefined,
      }
    })
}

export async function fetchLever(): Promise<SourceResult> {
  const source = "lever"
  const boards = leverBoards()
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
    error: errors === boards.length && boards.length > 0 ? "all lever boards failed" : undefined,
  }
}
