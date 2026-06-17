"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateApplicationAction } from "@/app/(app)/applications/actions"

export type EditTarget = {
  id: string
  companyName: string
  role: string | null
  channel: string | null
  notes: string | null
}

export function EditApplicationDialog({
  target,
  open,
  onOpenChange,
}: {
  target: EditTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [channel, setChannel] = React.useState(target?.channel ?? "email")
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    setChannel(target?.channel ?? "email")
  }, [target])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!target) return
    const form = new FormData(event.currentTarget)

    startTransition(() => {
      void (async () => {
        const result = await updateApplicationAction({
          id: target.id,
          role: String(form.get("role") ?? ""),
          channel,
          notes: String(form.get("notes") ?? ""),
        })
        if (result.ok) {
          toast.success("Application updated")
          onOpenChange(false)
          router.refresh()
        } else {
          toast.error(result.error)
        }
      })()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit application</DialogTitle>
          <DialogDescription>{target?.companyName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" name="role" defaultValue={target?.role ?? ""} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="form">Application form</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" defaultValue={target?.notes ?? ""} autoComplete="off" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
