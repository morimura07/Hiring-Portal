"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number)
  const d = new Date(y, m - 1 + months, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function MonthSelector({ period }: { period: string }) {
  const router = useRouter()
  const go = (p: string) => router.push(`/score-management?period=${p}`)

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => go(shiftPeriod(period, -1))} aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="month"
          value={period}
          onChange={(e) => e.target.value && go(e.target.value)}
          className="w-[170px] pl-8"
        />
      </div>
      <Button variant="outline" size="icon" onClick={() => go(shiftPeriod(period, 1))} aria-label="Next month">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
