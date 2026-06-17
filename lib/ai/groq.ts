import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/crypto"

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const MODEL = "llama-3.3-70b-versatile"

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }
const ok = <T>(data: T): Result<T> => ({ ok: true, data })
const fail = (error: string): Result<never> => ({ ok: false, error })

// ---------- key + profile storage ----------

export async function saveGroqKey(userId: string, key: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { groqApiKey: encrypt(key.trim()) } })
}

export async function clearGroqKey(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { groqApiKey: null } })
}

export async function saveBidProfile(userId: string, profile: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { bidProfile: profile.trim() || null } })
}

async function getGroqKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { groqApiKey: true } })
  if (user?.groqApiKey) {
    try {
      return decrypt(user.groqApiKey)
    } catch {
      return null
    }
  }
  return process.env.GROQ_API_KEY ?? null
}

export async function getAiStatus(userId: string): Promise<{ hasKey: boolean; bidProfile: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { groqApiKey: true, bidProfile: true } })
  return { hasKey: Boolean(user?.groqApiKey || process.env.GROQ_API_KEY), bidProfile: user?.bidProfile ?? "" }
}

// ---------- bid generation ----------

const SYSTEM_PROMPT = `You help a senior software engineer write the BODY of a short job-application email (a "bid") to a company that is hiring.

Voice and rules:
- Sound like a real, confident senior engineer: warm, casual, direct — not corporate, not robotic.
- 90-160 words. At most two short paragraphs.
- Open naturally. NEVER start with "I am writing to apply", "I am excited", "I hope this email finds you", or "Dear".
- Mention 2-3 SPECIFIC technologies or problems from the job that genuinely fit the candidate. Be concrete, not generic.
- Use contractions and plain language. A little personality is good.
- BANNED words/phrases: passionate, synergy, leverage, cutting-edge, fast-paced, dynamic, results-driven, "perfect fit", "I believe", "As an AI", "delve", "tapestry", "in today's world".
- No bullet points, no subject line, no markdown, no placeholders like [Name] or [Company].
- End with one short, friendly closing line and a sign-off like "Best," (do NOT invent a name after it).
Return ONLY the email body text.`

export async function generateBid(
  userId: string,
  input: { jobPostingId?: string | null; companyId?: string | null },
): Promise<Result<{ text: string }>> {
  const apiKey = await getGroqKey(userId)
  if (!apiKey) return fail("No Groq API key. Add one in Settings → AI bid generation.")

  const job = input.jobPostingId
    ? await prisma.jobPosting.findUnique({ where: { id: input.jobPostingId }, include: { company: true } })
    : input.companyId
      ? await prisma.jobPosting.findFirst({
          where: { companyId: input.companyId },
          orderBy: { postedAt: "desc" },
          include: { company: true },
        })
      : null
  if (!job) return fail("No job posting found to base the bid on.")

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, bidProfile: true } })

  const userPrompt = [
    `Role: ${job.title}`,
    `Company: ${job.company.name}`,
    job.stack.length ? `Key stack: ${job.stack.join(", ")}` : "",
    job.salaryText || job.salaryMin ? `` : "",
    user?.bidProfile ? `\nCandidate background (use it, don't copy verbatim):\n${user.bidProfile}` : "",
    `\nJob description:\n${(job.description ?? "").slice(0, 2200)}`,
    `\nWrite the bid now.`,
  ]
    .filter(Boolean)
    .join("\n")

  let res: Response
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.75,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    })
  } catch (err) {
    return fail(`Couldn't reach Groq: ${(err as Error).message}`)
  }

  if (res.status === 401) return fail("Groq rejected the API key. Check it in Settings.")
  if (!res.ok) return fail(`Groq error ${res.status}: ${(await res.text()).slice(0, 160)}`)

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) return fail("Groq returned no content. Try again.")

  return ok({ text })
}
