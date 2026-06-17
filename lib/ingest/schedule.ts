import { prisma } from "@/lib/prisma"

export const INTERVAL_OPTIONS = [2, 5, 8, 24, 48] as const

export const INTERVAL_LABELS: Record<number, string> = {
  2: "Every 2 hours",
  5: "Every 5 hours",
  8: "Every 8 hours",
  24: "Once a day",
  48: "Every 2 days",
}

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
