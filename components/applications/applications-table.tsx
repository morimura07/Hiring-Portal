"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Mail, ExternalLink, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { StatusSelect } from "@/components/applications/status-select"
import { EditApplicationDialog, type EditTarget } from "@/components/applications/edit-application-dialog"
import { withdrawApplicationAction } from "@/app/(app)/applications/actions"
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/lib/format"

export type ApplicationRow = {
  id: string
  companyId: string
  companyName: string
  contactEmail: string | null
  role: string | null
  status: string
  channel: string | null
  appliedAt: string
  conversations: number
}

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })

export function ApplicationsTable({
  applications,
  counts,
  total,
  activeStatus,
}: {
  applications: ApplicationRow[]
  counts: Record<string, number>
  total: number
  activeStatus?: string
}) {
  const router = useRouter()
  const [editTarget, setEditTarget] = React.useState<EditTarget | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [withdrawTarget, setWithdrawTarget] = React.useState<ApplicationRow | null>(null)
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  function filter(status?: string) {
    router.push(status ? `/applications?status=${status}` : "/applications")
  }

  function openEdit(row: ApplicationRow) {
    setEditTarget({ id: row.id, companyName: row.companyName, role: row.role, channel: row.channel, notes: null })
    setEditOpen(true)
  }

  async function confirmWithdraw() {
    if (!withdrawTarget) return
    setPendingId(withdrawTarget.id)
    const result = await withdrawApplicationAction(withdrawTarget.id)
    setPendingId(null)
    if (result.ok) {
      toast.success("Application withdrawn")
      setWithdrawTarget(null)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const chip = (label: string, count: number, status?: string) => {
    const active = (status ?? "") === (activeStatus ?? "")
    return (
      <button
        key={label}
        onClick={() => filter(status)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:bg-accent",
        )}
      >
        {label}
        <span className={cn("rounded-full px-1.5 text-[10px]", active ? "bg-primary-foreground/20" : "bg-muted")}>
          {count}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium tracking-[-0.01em]">Applications</h2>
        <p className="text-sm text-muted-foreground">Your outreach pipeline — every attempt is kept permanently.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {chip("All", total, undefined)}
        {APPLICATION_STATUSES.map((s) => chip(STATUS_LABELS[s], counts[s] ?? 0, s))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Send className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  No applications {activeStatus ? `in ${STATUS_LABELS[activeStatus]}` : "yet"}.{" "}
                  <Link href="/companies" className="text-primary hover:underline">
                    Browse discovery
                  </Link>
                </TableCell>
              </TableRow>
            )}
            {applications.map((row) => {
              const busy = pendingId === row.id
              const subject = encodeURIComponent(`${row.role ?? "Opportunity"} — ${row.companyName}`)
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/companies/${row.companyId}`} className="hover:underline">
                      {row.companyName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.role ?? "—"}</TableCell>
                  <TableCell>
                    <StatusSelect id={row.id} value={row.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.channel ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{dateFmt.format(new Date(row.appliedAt))}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={busy}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(row)}>Edit</DropdownMenuItem>
                        {row.contactEmail && (
                          <DropdownMenuItem asChild>
                            <a href={`mailto:${row.contactEmail}?subject=${subject}`}>
                              <Mail className="h-4 w-4" />
                              Email contact
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/companies/${row.companyId}`}>
                            <ExternalLink className="h-4 w-4" />
                            View company
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setWithdrawTarget(row)}
                          className="text-destructive focus:text-destructive"
                        >
                          Withdraw
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <EditApplicationDialog target={editTarget} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={Boolean(withdrawTarget)} onOpenChange={(o) => !o && setWithdrawTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw application?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your application to <span className="font-medium">{withdrawTarget?.companyName}</span>.
              You can apply again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmWithdraw()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
