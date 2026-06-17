import { prisma } from "@/lib/prisma"
import { INTERVAL_OPTIONS } from "@/lib/ingest/schedule-constants"

export { INTERVAL_OPTIONS, INTERVAL_LABELS } from "@/lib/ingest/schedule-constants"

export async function getSchedule() {
  const existing = await prisma.ingestSchedule.findUnique({ where: { id: "singleton" } })
  if (existing) return existing
  return prisma.ingestSchedule.create({ data: { id: "singleton" } })
}

export async function setSchedule(input: { enabled: boolean; intervalHours: number }) {
  const intervalHours = (INTERVAL_OPTIONS as readonly number[]).includes(input.intervalHours)
    ? input.intervalHours
    : 8
  // When enabling (or changing interval), schedule the next run one interval out.
  const nextRunAt = input.enabled ? new Date(Date.now() + intervalHours * 3600_000) : null
  return prisma.ingestSchedule.upsert({
    where: { id: "singleton" },
    update: { enabled: input.enabled, intervalHours, nextRunAt },
    create: { id: "singleton", enabled: input.enabled, intervalHours, nextRunAt },
  })
}
