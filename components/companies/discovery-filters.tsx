"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SOURCE_LABELS } from "@/lib/format"

export function DiscoveryFilters({
  stats,
}: {
  stats: { total: number; withEmail: number; withSalary: number }
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = React.useState(params.get("q") ?? "")

  const update = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString())
      next.delete("page") // reset pagination on any filter change
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k)
        else next.set(k, v)
      }
      router.push(`/companies?${next.toString()}`)
    },
    [params, router],
  )

  // Debounced search.
  React.useEffect(() => {
    const current = params.get("q") ?? ""
    if (q === current) return
    const t = setTimeout(() => update({ q: q || null }), 400)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const source = params.get("source") ?? "all"
  const toggle = (key: string) => update({ [key]: params.get(key) ? null : "1" })

  const chip = (key: string, label: string, count?: number) => (
    <button
      onClick={() => toggle(key)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        params.get(key)
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent",
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn("rounded-full px-1.5 text-[10px]", params.get(key) ? "bg-primary-foreground/20" : "bg-muted")}>
          {count}
        </span>
      )}
    </button>
  )

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search role, company, or stack…"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {chip("hasSalary", "Has salary", stats.withSalary)}
        {chip("remote", "Remote")}

        <Select value={source} onValueChange={(v) => update({ source: v === "all" ? null : v })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
