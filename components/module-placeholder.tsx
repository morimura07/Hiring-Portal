import type { LucideIcon } from "lucide-react"

export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 px-6 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        <span className="mt-5 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
          Built in the next Phase 1 step
        </span>
      </div>
    </div>
  )
}
