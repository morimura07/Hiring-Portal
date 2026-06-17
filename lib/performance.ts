import { prisma } from "@/lib/prisma"
import { writeAudit } from "@/lib/audit"

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }
const ok = <T>(data: T): Result<T> => ({ ok: true, data })
const fail = (error: string): Result<never> => ({ ok: false, error })

// ---------- period helpers ----------

export function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function isValidPeriod(p?: string | null): p is string {
  return typeof p === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(p)
}

export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" })
}

function shortPeriodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "2-digit" })
}

function lastNPeriods(n: number): string[] {
  const now = new Date()
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  return out
}

// ---------- per-month team view ----------

/** Team members with their entries for a given month and the month total ($). */
export async function getTeamPerformance(period: string) {
  const users = await prisma.user.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      performanceEntries: {
        where: { period },
        orderBy: { createdAt: "asc" },
        select: { id: true, amount: true, note: true, createdAt: true },
      },
    },
  })
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
    entries: u.performanceEntries,
    total: u.performanceEntries.reduce((sum, e) => sum + e.amount, 0),
  }))
}

export async function addPerformanceEntry(input: {
  actorId: string
  userId: string
  amount: number
  period: string
  note?: string
}): Promise<Result<{ id: string }>> {
  const amount = Math.trunc(input.amount)
  if (!Number.isFinite(amount) || amount === 0) return fail("Enter a non-zero amount.")
  if (Math.abs(amount) > 100_000_000) return fail("Amount is too large.")
  if (!isValidPeriod(input.period)) return fail("Invalid month.")

  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } })
  if (!user) return fail("User not found.")

  const entry = await prisma.performanceEntry.create({
    data: {
      userId: input.userId,
      amount,
      period: input.period,
      note: input.note?.trim() || null,
      createdById: input.actorId,
    },
  })
  await writeAudit({
    actorUserId: input.actorId,
    action: "performance.add",
    entityType: "PerformanceEntry",
    entityId: entry.id,
    metadata: { userId: input.userId, amount, period: input.period },
  })
  return ok({ id: entry.id })
}

export async function deletePerformanceEntry(input: {
  actorId: string
  id: string
}): Promise<Result<undefined>> {
  const entry = await prisma.performanceEntry.findUnique({ where: { id: input.id } })
  if (!entry) return fail("Entry not found.")

  await prisma.performanceEntry.delete({ where: { id: input.id } })
  await writeAudit({
    actorUserId: input.actorId,
    action: "performance.remove",
    entityType: "PerformanceEntry",
    entityId: input.id,
    metadata: { userId: entry.userId, amount: entry.amount, period: entry.period },
  })
  return ok(undefined)
}

// ---------- monthly aggregates for the dashboard charts ----------

export async function getMonthlyPerformance(monthsBack = 6) {
  const periods = lastNPeriods(monthsBack)
  const users = await prisma.user.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true },
  })
  const grouped = await prisma.performanceEntry.groupBy({
    by: ["period", "userId"],
    where: { period: { in: periods } },
    _sum: { amount: true },
  })
  const byKey = new Map<string, number>()
  for (const g of grouped) byKey.set(`${g.period}:${g.userId}`, g._sum.amount ?? 0)

  const memberNames = users.map((u) => u.name ?? u.email)

  const teamSeries = periods.map((p) => ({
    label: shortPeriodLabel(p),
    total: users.reduce((s, u) => s + (byKey.get(`${p}:${u.id}`) ?? 0), 0),
  }))

  const memberSeries = periods.map((p) => {
    const row: Record<string, string | number> = { label: periodLabel(p) }
    for (const u of users) row[u.name ?? u.email] = byKey.get(`${p}:${u.id}`) ?? 0
    return row
  })

  return { teamSeries, memberSeries, memberNames }
}
