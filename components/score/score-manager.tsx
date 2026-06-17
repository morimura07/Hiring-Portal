"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Role } from "@prisma/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { avatarSrc } from "@/lib/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { addScoreAction, deleteScoreAction } from "@/app/(app)/score-management/actions"

type Entry = { id: string; amount: number; note: string | null; createdAt: string }
export type Member = {
  id: string
  name: string | null
  email: string
  role: Role
  avatarUrl: string | null
  entries: Entry[]
  total: number
}

function initials(name: string | null, email: string) {
  if (name) return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })

function money(n: number): string {
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString()}`
}

export function ScoreManager({ members, period }: { members: Member[]; period: string }) {
  const router = useRouter()
  const [target, setTarget] = React.useState<Member | null>(null)
  const [open, setOpen] = React.useState(false)
  const [sign, setSign] = React.useState<"+" | "-">("+")
  const [amount, setAmount] = React.useState("")
  const [pending, startTransition] = React.useTransition()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  function openFor(member: Member) {
    setTarget(member)
    setSign("+")
    setAmount("")
    setOpen(true)
  }

  function submit() {
    const n = parseInt(amount, 10)
    if (!target || !Number.isFinite(n) || n <= 0) {
      toast.error("Enter a positive number.")
      return
    }
    const value = sign === "-" ? -n : n
    startTransition(() => {
      void (async () => {
        const r = await addScoreAction({ userId: target.id, amount: value, period })
        if (r.ok) {
          toast.success(`${money(value)} added to ${target.name ?? target.email}`)
          setOpen(false)
          router.refresh()
        } else {
          toast.error(r.error)
        }
      })()
    })
  }

  async function remove(entryId: string) {
    setDeletingId(entryId)
    const r = await deleteScoreAction(entryId)
    setDeletingId(null)
    if (r.ok) {
      toast.success("Entry removed")
      router.refresh()
    } else {
      toast.error(r.error)
    }
  }

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <Card key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: name + add + entry cards */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Avatar className="h-8 w-8">
              {avatarSrc(m) && <AvatarImage src={avatarSrc(m)} alt={m.name ?? m.email} />}
              <AvatarFallback className="text-[10px]">{initials(m.name, m.email)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{m.name ?? m.email}</span>
            <Badge variant={m.role === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
              {m.role === "ADMIN" ? "Admin" : "Member"}
            </Badge>

            <button
              onClick={() => openFor(m)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              title="Add performance"
              aria-label={`Add performance for ${m.name ?? m.email}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>

            <div className="flex flex-wrap items-center gap-1.5">
              {m.entries.map((e) => (
                <span
                  key={e.id}
                  title={`Added ${dateFmt.format(new Date(e.createdAt))}${e.note ? ` · ${e.note}` : ""}`}
                  className={cn(
                    "group inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
                    e.amount >= 0
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
                  )}
                >
                  {e.amount > 0 ? "+" : ""}
                  {e.amount.toLocaleString()}
                  <button
                    onClick={() => remove(e.id)}
                    disabled={deletingId === e.id}
                    className="opacity-0 transition-opacity hover:text-foreground group-hover:opacity-60"
                    aria-label="Remove entry"
                  >
                    {deletingId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Right: total */}
          <div className="shrink-0 text-right">
            <div className="text-xs text-muted-foreground">Total</div>
            <div
              className={cn(
                "text-lg font-semibold tabular-nums",
                m.total > 0 ? "text-emerald-600 dark:text-emerald-400" : m.total < 0 ? "text-red-600 dark:text-red-400" : "",
              )}
            >
              {money(m.total)}
            </div>
          </div>
        </Card>
      ))}

      {/* Performance input modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>User&apos;s Performance</DialogTitle>
            <DialogDescription>{target?.name ?? target?.email}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md border p-0.5">
              {(["+", "-"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSign(s)}
                  className={cn(
                    "h-8 w-9 rounded text-sm font-medium transition-colors",
                    sign === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="500"
                className="pl-6"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !amount}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
