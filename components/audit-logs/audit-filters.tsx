"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { auditActionLabel } from "@/lib/format"

export function AuditFilters({ actions }: { actions: string[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = React.useState(params.get("q") ?? "")

  const update = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString())
      next.delete("page")
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k)
        else next.set(k, v)
      }
      router.push(`/audit-logs?${next.toString()}`)
    },
    [params, router],
  )

  React.useEffect(() => {
    const current = params.get("q") ?? ""
    if (q === current) return
    const t = setTimeout(() => update({ q: q || null }), 400)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const action = params.get("action") ?? "all"

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search action, user, or entity…"
          className="pl-9"
        />
      </div>
      <Select value={action} onValueChange={(v) => update({ action: v === "all" ? null : v })}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All actions</SelectItem>
          {actions.map((a) => (
            <SelectItem key={a} value={a}>
              {auditActionLabel(a)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
