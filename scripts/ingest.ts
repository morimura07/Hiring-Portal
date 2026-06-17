import { runIngest, ALL_SOURCES, type SourceKey } from "@/lib/ingest/run"
import { prisma } from "@/lib/prisma"

/**
 * CLI ingestion. Usage:
 *   pnpm ingest                 # all sources
 *   pnpm ingest remoteok remotive
 */
async function main() {
  const args = process.argv.slice(2).filter((a) => (ALL_SOURCES as readonly string[]).includes(a)) as SourceKey[]
  const t0 = Date.now()
  console.log(`Ingesting from: ${args.length ? args.join(", ") : "all sources"} ...`)

  const summary = await runIngest({ sources: args.length ? args : undefined })

  console.log("\nPer source:")
  for (const s of summary.bySource) {
    console.log(`  ${s.source.padEnd(16)} fetched ${String(s.fetched).padStart(4)}${s.error ? `  (error: ${s.error})` : ""}`)
  }
  console.log("\nTotals:")
  console.log(`  companies upserted : ${summary.companies}`)
  console.log(`  jobs created       : ${summary.jobsCreated}`)
  console.log(`  jobs updated       : ${summary.jobsUpdated}`)
  console.log(`  dup skipped/removed: ${summary.jobsSkipped} / ${summary.duplicatesRemoved}`)
  console.log(`  contacts created   : ${summary.contacts}`)
  console.log(`  jobs with email    : ${summary.withEmail}`)
  console.log(`  jobs with salary   : ${summary.withSalary}`)
  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
