// Client-safe constants (no prisma import) — used by the Settings UI.

export const INTERVAL_OPTIONS = [2, 5, 8, 24, 48] as const

export const INTERVAL_LABELS: Record<number, string> = {
  2: "Every 2 hours",
  5: "Every 5 hours",
  8: "Every 8 hours",
  24: "Once a day",
  48: "Every 2 days",
}
