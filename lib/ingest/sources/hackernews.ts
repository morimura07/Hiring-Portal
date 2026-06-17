import type { NormalizedJob, SourceResult } from "@/lib/ingest/types"
import {
  fetchJson,
  htmlToText,
  extractEmail,
  extractUrl,
  detectStack,
  detectRemote,
  parseSalary,
  truncate,
} from "@/lib/ingest/util"

type AlgoliaStory = { objectID: string; title: string; created_at_i: number }
type AlgoliaChild = { id: number; text: string | null; author: string | null; created_at_i: number }
type AlgoliaItem = { id: number; title?: string; created_at_i: number; children: AlgoliaChild[] }

// A realistic software-role phrase: optional seniority + optional domain + role noun.
const ROLE_RE =
  /((?:sr\.?|jr\.?|senior|staff|principal|lead|founding|junior|head\s+of|mid[\s-]?level|vp\s+of|director\s+of)\s+)?((?:full[\s-]?stack|back[\s-]?end|front[\s-]?end|software|platform|infrastructure|data|machine\s+learning|ml|ai|devops|site\s+reliability|security|mobile|ios|android|web|cloud|systems|embedded|qa|test|firmware|hardware|game|blockchain|smart\s+contract|applied|research|forward\s+deployed)\s+)?(engineer(?:ing)?|developer|programmer|scientist|architect|sre)s?/i

const LOCATION_HINT = /\b(remote|onsite|on-site|hybrid|worldwide|anywhere|\b[A-Z]{2}\b|, )/

async function findRecentThreads(limit: number): Promise<AlgoliaStory[]> {
  const data = await fetchJson<{ hits: AlgoliaStory[] }>(
    "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=who%20is%20hiring&hitsPerPage=20",
  )
  const hits = (data.hits ?? []).filter(
    (h) => /who is hiring/i.test(h.title) && !/freelancer|wants to be hired/i.test(h.title),
  )
  return hits.slice(0, limit)
}

function cleanRole(raw: string): string {
  let role = raw.replace(/\s+/g, " ").trim().replace(/^[\s•|,-]+|[\s•|,:-]+$/g, "")
  if (role.length > 70) role = role.slice(0, 70).trim()
  return role.charAt(0).toUpperCase() + role.slice(1)
}

/** Does this segment look like the role itself (vs a company name)? */
function isMostlyRole(seg: string): boolean {
  const m = seg.match(ROLE_RE)
  if (!m) return false
  const bare = seg.replace(/\([^)]*\)/g, "").trim()
  if (m[0].length >= bare.length * 0.5) return true
  // Segment leads with a qualified role phrase → it's a role line, not a company.
  if (
    (m.index ?? 99) <= 1 &&
    /(senior|staff|principal|lead|founding|junior|forward|full|back|front|software|data|infrastructure|platform|devops|security|mobile|machine)/i.test(m[0])
  )
    return true
  return false
}

/** Extract a clean role title: scan segments after the company, then the head of the text. */
function extractRole(segments: string[], text: string): string | undefined {
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]
    if (!seg || seg.length > 90 || /^https?:/i.test(seg)) continue
    const m = seg.match(ROLE_RE)
    if (m) return cleanRole(m[0])
  }
  const head = text.slice(0, 600)
  const m = head.match(ROLE_RE)
  if (m) return cleanRole(m[0])
  return undefined
}

function cleanCompanyName(raw: string): string | undefined {
  // A leading "Location:/Salary:/Role:" label means the post didn't lead with a company.
  if (/^\s*(location|salary|comp|compensation|role|position|stack|tech|website|url)\s*:/i.test(raw)) {
    return undefined
  }
  const name = raw
    .replace(/\([^)]*\)/g, "") // drop "(YC S21)" etc.
    .replace(/https?:\/?\/?\s*[^\s|]+/gi, "") // strip leaked URLs (incl. "https: foo" after html-strip)
    .replace(/^at\s+/i, "") // "At Tether …" → "Tether …"
    .replace(/[,:]?\s*(?:we'?re|we are|is|are)\s+hiring!?.*$/i, "") // "… we're hiring!" tail
    .replace(/[|•–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (!name || name.length > 50 || name.includes("@")) return undefined
  if (name.split(/\s+/).length > 7) return undefined // a sentence, not a company
  if (isMostlyRole(name)) return undefined // first segment is a role, not a company
  return name
}

function titleCaseHost(host: string): string {
  const label = host.replace(/^www\./, "").split(".")[0]
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Fallback company from an email domain or first URL host. */
function companyFromText(email?: string, url?: string): { name?: string; website?: string; domain?: string } {
  const tryHost = (h?: string) => (h && !/(gmail|googlemail|outlook|hotmail|yahoo|proton|icloud)\./i.test(h) ? h : undefined)
  if (email) {
    const host = tryHost(email.split("@")[1])
    if (host) return { name: titleCaseHost(host), domain: host, website: `https://${host.replace(/^www\./, "")}` }
  }
  if (url) {
    try {
      const host = tryHost(new URL(url).hostname)
      if (host) return { name: titleCaseHost(host), domain: host, website: `https://${host.replace(/^www\./, "")}` }
    } catch {
      /* ignore */
    }
  }
  return {}
}

export async function fetchHackerNews(): Promise<SourceResult> {
  const source = "hn_whoishiring"
  try {
    // Pull the last few monthly "Who is hiring?" threads for more volume; cross-month
    // duplicates collapse later via the dedupe key.
    const threads = await findRecentThreads(3)
    if (threads.length === 0) return { source, jobs: [], error: "No who-is-hiring thread found" }

    const childArrays = await Promise.all(
      threads.map(async (t) => {
        try {
          const item = await fetchJson<AlgoliaItem>(`https://hn.algolia.com/api/v1/items/${t.objectID}`)
          return (item.children ?? []).slice(0, 500)
        } catch {
          return []
        }
      }),
    )
    const children = childArrays.flat()

    const jobs: NormalizedJob[] = []
    for (const c of children) {
      if (!c.text) continue
      const text = htmlToText(c.text)
      if (!text) continue

      const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? ""
      const segments = firstLine.split("|").map((s) => s.trim()).filter(Boolean)

      const email = extractEmail(text)
      const url = extractUrl(text)
      const stack = detectStack(text)
      const role = extractRole(segments, text)

      // Resolve company: first segment, else derive from email/URL domain.
      let companyName = cleanCompanyName(segments[0] ?? "")
      const derived = companyName ? {} : companyFromText(email, url)
      companyName = companyName ?? derived.name

      // Need a company and at least one signal of being an actionable dev posting.
      if (!companyName) continue
      if (!role && stack.length === 0 && !email) continue

      const salary = parseSalary(text)
      const locationSeg = segments
        .slice(1)
        .find((s) => s !== role && s.length <= 40 && LOCATION_HINT.test(s))

      jobs.push({
        source,
        sourceId: `hn-${c.id}`,
        companyName,
        companyWebsite: derived.website,
        companyDomain: derived.domain,
        title: role ?? (stack.length || email ? "Software Engineer" : "Engineering role"),
        description: truncate(text),
        stack,
        remote: detectRemote(text),
        location: locationSeg,
        salaryMin: salary.salaryMin,
        salaryMax: salary.salaryMax,
        currency: salary.currency,
        url,
        applyUrl: url,
        contactEmail: email,
        postedAt: new Date(c.created_at_i * 1000),
      })
    }

    return { source, jobs }
  } catch (err) {
    return { source, jobs: [], error: (err as Error).message }
  }
}
