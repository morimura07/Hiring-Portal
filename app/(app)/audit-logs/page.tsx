import Link from "next/link"
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react"
import { requireAdmin } from "@/lib/session"
import { getAuditLogs, getAuditActions } from "@/lib/audit-logs"
import { auditActionLabel, auditActionVariant } from "@/lib/format"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AuditFilters } from "@/components/audit-logs/audit-filters"

export const dynamic = "force-dynamic"

const timeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })

type SP = { action?: string; q?: string; page?: string }

function buildQuery(sp: SP, patch: Partial<Record<keyof SP, string>>): string {
  const merged = { ...sp, ...patch }
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v)
  return params.toString()
}

function summarizeMeta(meta: unknown): string {
  if (!meta || typeof meta !== "object") return ""
  return Object.entries(meta as Record<string, unknown>)
    .filter(([, v]) => v != null && typeof v !== "object")
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ")
}

export default async function AuditLogsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin()

  const filters = {
    action: searchParams.action,
    q: searchParams.q,
    page: searchParams.page ? parseInt(searchParams.page, 10) : 1,
  }

  const [result, actions] = await Promise.all([getAuditLogs(filters), getAuditActions()])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium tracking-[-0.01em]">Audit Logs</h2>
        <p className="text-sm text-muted-foreground">
          {result.total.toLocaleString()} events · immutable record of activity across the platform.
        </p>
      </div>

      <AuditFilters actions={actions} />

      {result.logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 px-6 py-16 text-center">
          <ScrollText className="mb-3 h-8 w-8 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No matching audit events.</p>
        </div>
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.logs.map((log) => {
                  const meta = summarizeMeta(log.metadata)
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {timeFmt.format(log.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {log.actor ? (
                          <span title={log.actor.email ?? undefined}>{log.actor.name ?? log.actor.email}</span>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={auditActionVariant(log.action)} className="text-[10px]">
                          {auditActionLabel(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[log.entityType, meta].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          {result.pageCount > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <Link
                href={`/audit-logs?${buildQuery(searchParams, { page: String(result.page - 1) })}`}
                aria-disabled={result.page <= 1}
                className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
                  result.page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-accent"
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Link>
              <span className="text-sm text-muted-foreground">
                Page {result.page} of {result.pageCount}
              </span>
              <Link
                href={`/audit-logs?${buildQuery(searchParams, { page: String(result.page + 1) })}`}
                aria-disabled={result.page >= result.pageCount}
                className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
                  result.page >= result.pageCount ? "pointer-events-none opacity-40" : "hover:bg-accent"
                }`}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
