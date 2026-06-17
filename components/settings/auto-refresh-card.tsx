"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { INTERVAL_OPTIONS, INTERVAL_LABELS } from "@/lib/ingest/schedule-constants"
import { saveScheduleAction } from "@/app/(app)/settings/actions"

const fmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })

export function AutoRefreshCard({
  enabled,
  intervalHours,
  lastRunAt,
  nextRunAt,
}: {
  enabled: boolean
  intervalHours: number
  lastRunAt: string | null
  nextRunAt: string | null
}) {
  const router = useRouter()
  const [on, setOn] = React.useState(enabled)
  const [interval, setInterval] = React.useState(String(intervalHours))
  const [pending, startTransition] = React.useTransition()

  function save(nextOn: boolean, nextInterval: string) {
    startTransition(() => {
      void (async () => {
        await saveScheduleAction({ enabled: nextOn, intervalHours: parseInt(nextInterval, 10) })
        toast.success(nextOn ? "Automatic updates enabled" : "Automatic updates off")
        router.refresh()
      })()
    })
  }

  function toggle(next: boolean) {
    setOn(next)
    save(next, interval)
  }

  function changeInterval(next: string) {
    setInterval(next)
    save(on, next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4" />
          Automatic discovery updates
        </CardTitle>
        <CardDescription>
          Keep job postings growing on their own — the portal refreshes from all sources on a schedule,
          adds new postings, and skips duplicates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <span>Enable automatic updates</span>
          </div>
          <Switch checked={on} onCheckedChange={toggle} disabled={pending} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Update frequency</span>
          <Select value={interval} onValueChange={changeInterval} disabled={!on || pending}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {INTERVAL_LABELS[h]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {on && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <div>Last refresh: {lastRunAt ? fmt.format(new Date(lastRunAt)) : "—"}</div>
            <div>Next refresh: {nextRunAt ? fmt.format(new Date(nextRunAt)) : "soon"}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
