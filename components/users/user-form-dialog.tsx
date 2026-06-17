"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Role } from "@prisma/client"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createUserAction, updateUserAction } from "@/app/(app)/users/actions"

type EditTarget = { id: string; name: string | null; email: string; role: Role }

export function UserFormDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target?: EditTarget | null
}) {
  const router = useRouter()
  const isEdit = Boolean(target)
  const [isPending, startTransition] = React.useTransition()
  const [role, setRole] = React.useState<Role>(target?.role ?? "MEMBER")

  // Reset role when the dialog target changes.
  React.useEffect(() => {
    setRole(target?.role ?? "MEMBER")
  }, [target])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    async function submit() {
      const result = isEdit
        ? await updateUserAction({
            id: target!.id,
            name: String(form.get("name") ?? ""),
            role,
          })
        : await createUserAction({
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            role,
          })

      if (result.ok) {
        toast.success(isEdit ? "User updated" : "User created")
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    }

    startTransition(() => {
      void submit()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the member's name and role." : "Create a team account. There is no public sign-up."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required defaultValue={target?.name ?? ""} autoComplete="off" />
          </div>

          {isEdit ? (
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={target?.email ?? ""} disabled />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" name="email" type="email" required autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" name="password" type="text" required minLength={8} autoComplete="off" />
                <p className="text-xs text-muted-foreground">At least 8 characters. Share it securely.</p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
