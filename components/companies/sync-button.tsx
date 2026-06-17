"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function SyncButton() {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function refresh() {
    startTransition(() => {
      void (async () => {
        const id = toast.loading("Fetching the latest job postings… this can take up to a minute.")
        try {
          const res = await fetch("/api/ingest", { method: "POST" })
          const data = await res.json()
          if (!res.ok || !data.ok) throw new Error(data.error ?? "Refresh failed")
          const s = data.summary
          toast.success(`Updated: ${s.jobsCreated} new · ${s.jobsUpdated} refreshed · ${s.withEmail} with email`, {
            id,
          })
          router.refresh()
        } catch (err) {
          toast.error((err as Error).message, { id })
        }
      })()
    })
  }

  return (
    <Button onClick={refresh} disabled={isPending} variant="outline">
      <RefreshCw className={isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      {isPending ? "Refreshing…" : "Refresh"}
    </Button>
  )
}
