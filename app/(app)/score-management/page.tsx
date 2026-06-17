import { requireAdmin } from "@/lib/session"
import { getTeamPerformance, currentPeriod, isValidPeriod, periodLabel } from "@/lib/performance"
import { ScoreManager, type Member } from "@/components/score/score-manager"
import { MonthSelector } from "@/components/score/month-selector"

export const dynamic = "force-dynamic"

export default async function ScoreManagementPage({ searchParams }: { searchParams: { period?: string } }) {
  await requireAdmin()
  const period = isValidPeriod(searchParams.period) ? searchParams.period : currentPeriod()
  const team = await getTeamPerformance(period)

  const members: Member[] = team.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    avatarUrl: m.avatarUrl,
    total: m.total,
    entries: m.entries.map((e) => ({
      id: e.id,
      amount: e.amount,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
  }))

  const teamTotal = members.reduce((s, m) => s + m.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.01em]">Score Management</h2>
          <p className="text-sm text-muted-foreground">
            Performance for <span className="font-medium">{periodLabel(period)}</span> · click + to record a value.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <MonthSelector period={period} />
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Team total ({periodLabel(period)})</div>
            <div className="text-xl font-semibold tabular-nums">
              {teamTotal < 0 ? "-" : ""}${Math.abs(teamTotal).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <ScoreManager members={members} period={period} />
    </div>
  )
}
