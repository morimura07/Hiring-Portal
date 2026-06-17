export function formatSalary(
  min?: number | null,
  max?: number | null,
  currency?: string | null,
  text?: string | null,
): string | null {
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$"
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)
  if (min && max) return `${sym}${k(min)}–${sym}${k(max)}`
  if (min) return `${sym}${k(min)}+`
  if (text) return text.length > 28 ? text.slice(0, 28) + "…" : text
  return null
}

const relFmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const diffMs = d.getTime() - Date.now()
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000))
  if (Math.abs(days) >= 1) return relFmt.format(days, "day")
  const hours = Math.round(diffMs / (60 * 60 * 1000))
  return relFmt.format(hours, "hour")
}

export const SOURCE_LABELS: Record<string, string> = {
  hn_whoishiring: "HN Who's Hiring",
  remoteok: "RemoteOK",
  remotive: "Remotive",
  greenhouse: "Greenhouse",
  lever: "Lever",
}

export type BadgeVariant = "default" | "secondary" | "success" | "outline" | "destructive"

// Outreach pipeline statuses, in funnel order.
export const APPLICATION_STATUSES = [
  "DRAFT",
  "APPLIED",
  "RESPONDED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "CLOSED",
] as const

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  APPLIED: "Applied",
  RESPONDED: "Responded",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
  CLOSED: "Closed",
}

export const STATUS_VARIANT: Record<string, BadgeVariant> = {
  DRAFT: "outline",
  APPLIED: "secondary",
  RESPONDED: "success",
  INTERVIEWING: "default",
  OFFER: "success",
  REJECTED: "destructive",
  CLOSED: "outline",
}

// Friendly labels for audit-log actions.
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.login": "Signed in",
  "user.create": "Created user",
  "user.update": "Updated user",
  "user.role_change": "Changed role",
  "user.disable": "Disabled user",
  "user.enable": "Enabled user",
  "user.delete": "Deleted user",
  "application.create": "Applied to company",
  "application.status_change": "Changed status",
  "application.update": "Updated application",
  "application.withdraw": "Withdrew application",
  "message.send": "Sent email",
  "message.log_reply": "Logged reply",
  "ingest.run": "Ran discovery sync",
  "gmail.connect": "Connected Gmail",
  "gmail.disconnect": "Disconnected Gmail",
  "ai.key_saved": "Saved AI key",
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}

export function auditActionVariant(action: string): BadgeVariant {
  if (action.startsWith("user.delete") || action.startsWith("application.withdraw") || action.includes("disconnect"))
    return "destructive"
  if (action.startsWith("message.") || action.startsWith("gmail.connect")) return "success"
  if (action.startsWith("application.")) return "default"
  if (action.startsWith("ingest.") || action.startsWith("user.")) return "secondary"
  return "outline"
}
