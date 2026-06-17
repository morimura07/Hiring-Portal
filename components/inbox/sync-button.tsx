"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { syncInboxAction } from "@/app/(app)/inbox/actions"

export function InboxSyncButton() {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function sync() {
    startTransition(() => {
      void (async () => {
        const result = await syncInboxAction()
        if (result.ok) {
          toast.success(result.imported > 0 ? `${result.imported} new message(s)` : "Up to date")
          router.refresh()
        } else {
          toast.error(result.error)
        }
      })()
    })
  }

  return (
    <Button onClick={sync} disabled={isPending} variant="ghost" size="sm">
      <RefreshCw className={isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      {isPending ? "Syncing…" : "Sync"}
    </Button>
  )
}
