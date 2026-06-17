"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/lib/format"
import { updateStatusAction } from "@/app/(app)/applications/actions"

export function StatusSelect({ id, value }: { id: string; value: string }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function onChange(next: string) {
    if (next === value) return
    startTransition(() => {
      void (async () => {
        const result = await updateStatusAction(id, next)
        if (result.ok) {
          toast.success(`Moved to ${STATUS_LABELS[next]}`)
          router.refresh()
        } else {
          toast.error(result.error)
        }
      })()
    })
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-[150px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {APPLICATION_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
