"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ArrowUpDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// value = `${sort}:${dir}`
const OPTIONS = [
  { value: "posted:desc", label: "Newest" },
  { value: "posted:asc", label: "Oldest" },
  { value: "salary:desc", label: "Salary: high → low" },
  { value: "salary:asc", label: "Salary: low → high" },
  { value: "role:asc", label: "Role: A → Z" },
]

export function SortSelect() {
  const router = useRouter()
  const params = useSearchParams()
  const sort = params.get("sort")
  const dir = params.get("dir")
  const current = sort && dir ? `${sort}:${dir}` : "posted:desc"

  function onChange(value: string) {
    const [s, d] = value.split(":")
    const next = new URLSearchParams(params.toString())
    next.set("sort", s)
    next.set("dir", d)
    next.delete("page")
    router.push(`/companies?${next.toString()}`)
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
