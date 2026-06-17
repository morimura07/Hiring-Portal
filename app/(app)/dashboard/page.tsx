import Link from "next/link"
import { Building2, Briefcase, Mail, Send } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { getMonthlyPerformance } from "@/lib/performance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PerformanceCharts } from "@/components/dashboard/performance-charts"

async function getStats(userId: string) {
  try {
    const [companies, jobs, withEmail, myApplications] = await Promise.all([
      prisma.company.count(),
      prisma.jobPosting.count(),
      prisma.jobPosting.count({ where: { contactEmail: { not: null } } }),
      prisma.application.count({ where: { userId } }),
    ])
    return { companies, jobs, withEmail, myApplications, ok: true as const }
  } catch {
    return { companies: 0, jobs: 0, withEmail: 0, myApplications: 0, ok: false as const }
  }
}

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const stats = await getStats(user?.id ?? "")
  const perf = await getMonthlyPerformance(6)

  const cards = [
    { label: "Companies", value: stats.companies, icon: Building2 },
    { label: "Open dev roles", value: stats.jobs, icon: Briefcase },
    { label: "With contact email", value: stats.withEmail, icon: Mail },
    { label: "My applications", value: stats.myApplications, icon: Send },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.01em]">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">Real-time view of discovered roles and your outreach.</p>
        </div>
        <Button asChild>
          <Link href="/companies">Browse discovery</Link>
        </Button>
      </div>

      {!stats.ok && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Database not reachable. Check your Neon connection strings in <code>.env</code>.
        </div>
      )}

      {stats.ok && stats.jobs === 0 && (
        <div className="rounded-lg border border-blue-300/60 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          No job data yet. Run <code>pnpm ingest</code> (or click <strong>Sync now</strong> on Discovery as an admin) to pull
          real postings from HN, RemoteOK, Remotive, and Greenhouse.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">{c.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {perf && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Team performance (last 6 months)
          </h3>
          <PerformanceCharts
            teamSeries={perf.teamSeries}
            memberSeries={perf.memberSeries}
            memberNames={perf.memberNames}
          />
        </div>
      )}
    </div>
  )
}
