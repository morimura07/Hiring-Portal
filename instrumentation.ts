// Runs once when the server process starts. We use it to arm the in-process
// discovery auto-refresh scheduler (Node runtime only).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startIngestScheduler } = await import("@/lib/ingest/scheduler")
    startIngestScheduler()
  }
}
