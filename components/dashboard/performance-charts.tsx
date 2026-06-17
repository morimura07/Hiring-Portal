"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const COLORS = ["#004FE5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"]

const money = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString()}`

export function PerformanceCharts({
  teamSeries,
  memberSeries,
  memberNames,
}: {
  teamSeries: { label: string; total: number }[]
  memberSeries: Record<string, string | number>[]
  memberNames: string[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Team performance by month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={teamSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={money} tickLine={false} axisLine={false} fontSize={12} width={64} />
              <Tooltip formatter={(v) => money(Number(v))} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="total" fill="#004FE5" radius={[4, 4, 0, 0]} name="Team total" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">By member</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={memberSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={money} tickLine={false} axisLine={false} fontSize={12} width={64} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {memberNames.map((n, i) => (
                <Line key={n} type="monotone" dataKey={n} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
