const UA = "Mozilla/5.0 (compatible; HiringIntelligencePortal/1.0; +https://localhost)"

/** Fetch JSON with a User-Agent and timeout. Throws on non-2xx. */
export async function fetchJson<T = unknown>(url: string, timeoutMs = 25000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Repair mojibake — UTF-8 bytes that were mistakenly decoded as Latin-1
 * (e.g. "MÃ­dia" → "Mídia", "SÃ©nÃ©gal" → "Sénégal"). Only re-decodes when the
 * string looks corrupted and is fully within the Latin-1 range.
 */
export function fixMojibake(s: string): string {
  if (!/[Â-ô][-¿]/.test(s)) return s // no mojibake markers
  if (/[^\x00-\xff]/.test(s)) return s // contains real non-latin1 chars — leave alone
  try {
    const decoded = Buffer.from(s, "latin1").toString("utf8")
    return decoded.includes("�") ? s : decoded
  } catch {
    return s
  }
}

/** Normalize a raw company name: fix encoding, strip leading/trailing junk, collapse spaces. */
export function cleanCompanyName(raw: string): string {
  const name = fixMojibake(raw)
    .replace(/\s+/g, " ")
    .replace(/^[\s*•·▶►◆■→–—_~"'`.,|/\\(){}\[\]]+/, "") // leading junk (incl. markdown *)
    .replace(/[\s*•·▶►◆■→–—_~"'`|/\\]+$/, "") // trailing junk (keep "." for "Inc.")
    .trim()
  return name || raw.trim()
}

/** Run fn over items with bounded concurrency, returning settled results (never throws). */
export async function settledLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      try {
        results[idx] = { status: "fulfilled", value: await fn(items[idx]) }
      } catch (reason) {
        results[idx] = { status: "rejected", reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "company"
}

/** Fingerprint for collapsing duplicate postings: company + normalized role. */
export function jobDedupeKey(companyName: string, title: string): string {
  const role = title
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // drop parentheticals
    .replace(/[^a-z0-9]+/g, " ") // non-alphanumeric → space
    .replace(/\b(remote|hybrid|onsite|us|usa|uk|eu|emea|apac)\b/g, " ") // common location noise
    .replace(/\s+/g, " ")
    .trim()
  return `${slugify(companyName)}::${role}`
}

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
}

/** Decode numeric (&#x2F;, &#39;) and named (&amp;) HTML entities to their characters. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16))
      } catch {
        return " "
      }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(parseInt(d, 10))
      } catch {
        return " "
      }
    })
    .replace(/&[a-z]+;/gi, (m) => NAMED_ENTITIES[m.toLowerCase()] ?? " ")
}

/**
 * Strip HTML tags and decode entities into readable plain text.
 * Some sources (Greenhouse) return ENTITY-ENCODED html ("&lt;p&gt;…"), sometimes
 * double-encoded. So we decode first (turning encoded tags into real ones), strip
 * the tags, then decode again to catch any remaining (double-encoded) entities.
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return ""
  let s = decodeEntities(html)
  s = s
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\s*\/(p|div|h[1-6]|ul|ol|li|tr|section|header|footer|blockquote)\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
  s = decodeEntities(s)
  return s
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const EMAIL_RE = /[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9.-]+\.[a-z]{2,}/gi
// Junk / non-outreach mailboxes that show up in job-post boilerplate.
const EMAIL_BLOCKLIST =
  /(example|sentry|wixpress|\.png|\.jpg|\.gif|@2x|yourcompany|domain\.com|no-?reply|do-?not-?reply|postmaster|webmaster|mailer-daemon|abuse@|privacy@|legal@|compliance@|security@|accessib|accommodation|interviewing@|unsubscribe|dpo@|gdpr|press@|media@|investor|pay.?transparency|transparency@|benefits@|payroll@|vendor)/i
// Placeholder/template local-parts that appear in "email name@company.com" boilerplate.
const PLACEHOLDER_LOCAL = /^(name|firstname|lastname|first\.last|firstname\.lastname|yourname|your-?email|email|your-?name)@/i
// Strong recruiting/contact mailboxes to prefer when several emails are present.
const RECRUITING_PREFIX = /^(jobs?|careers?|recruit\w*|hiring|talent|hr@|apply|join|work|people)[\w.+-]*@/i

/** Extract the best contact email from free text (HN posts, job descriptions). */
export function extractEmail(text: string | null | undefined): string | undefined {
  if (!text) return undefined
  const matches = text.match(EMAIL_RE)
  if (!matches) return undefined
  const cleaned = matches
    .map((m) => m.toLowerCase())
    .filter((e) => !EMAIL_BLOCKLIST.test(e) && !PLACEHOLDER_LOCAL.test(e))
  if (cleaned.length === 0) return undefined
  // Prefer a recruiting-style address; otherwise the first plausible one.
  return cleaned.find((e) => RECRUITING_PREFIX.test(e)) ?? cleaned[0]
}

/** First http(s) URL in free text. */
export function extractUrl(text: string | null | undefined): string | undefined {
  if (!text) return undefined
  const m = text.match(/https?:\/\/[^\s"'<>)]+/i)
  return m ? m[0].replace(/[.,);]+$/, "") : undefined
}

const TECH_KEYWORDS = [
  "javascript", "typescript", "react", "next.js", "nextjs", "node", "node.js", "vue", "angular", "svelte",
  "python", "django", "flask", "fastapi", "go", "golang", "rust", "java", "kotlin", "scala", "ruby", "rails",
  "php", "laravel", "c++", "c#", ".net", "elixir", "clojure", "swift", "ios", "android", "flutter",
  "graphql", "postgres", "postgresql", "mysql", "mongodb", "redis", "kafka", "aws", "gcp", "azure",
  "kubernetes", "docker", "terraform", "devops", "sre", "machine learning", "ml", "ai", "llm", "data",
]

/** Detect a tech stack from free text by keyword scan. */
export function detectStack(text: string | null | undefined): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const found = new Set<string>()
  for (const kw of TECH_KEYWORDS) {
    const re = new RegExp(`(^|[^a-z0-9.+#])${kw.replace(/[.+#]/g, "\\$&")}([^a-z0-9.+#]|$)`, "i")
    if (re.test(lower)) found.add(kw)
  }
  return Array.from(found).slice(0, 12)
}

export function detectRemote(...texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => t && /\bremote\b/i.test(t))
}

/** Parse a salary range from text. Handles $120k, $120,000, 120k-150k, €80k–€100k. */
export function parseSalary(text: string | null | undefined): {
  salaryMin?: number
  salaryMax?: number
  currency?: string
} {
  if (!text) return {}
  const currency = /€|eur/i.test(text) ? "EUR" : /£|gbp/i.test(text) ? "GBP" : /\$|usd/i.test(text) ? "USD" : undefined
  const nums: number[] = []
  const re = /(\d{1,3}(?:[,\s]\d{3})+|\d{2,3}(?:\.\d)?\s*k|\d{5,7})/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    let raw = m[1].toLowerCase().replace(/[,\s]/g, "")
    let value: number
    if (raw.endsWith("k")) value = Math.round(parseFloat(raw) * 1000)
    else value = parseInt(raw, 10)
    if (value >= 20000 && value <= 1_000_000) nums.push(value)
  }
  if (nums.length === 0) return { currency }
  const salaryMin = Math.min(...nums)
  const salaryMax = Math.max(...nums)
  return { salaryMin, salaryMax: salaryMax === salaryMin ? undefined : salaryMax, currency }
}

const DEV_ROLE_RE =
  /(engineer|developer|software|backend|back-end|frontend|front-end|full[\s-]?stack|programmer|devops|sre|data\s+(engineer|scientist)|machine\s+learning|ml\b|ai\b|mobile|ios|android|platform|infrastructure|security\s+engineer|qa\s+engineer|web\s+developer)/i

/** Is this a software-developer role we care about? */
export function isDevRole(title: string): boolean {
  return DEV_ROLE_RE.test(title)
}

export function truncate(text: string | undefined, max = 4000): string | undefined {
  if (!text) return undefined
  return text.length > max ? text.slice(0, max) + "…" : text
}
