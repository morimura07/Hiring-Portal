import { prisma } from "@/lib/prisma"
import { cleanCompanyName, slugify } from "@/lib/ingest/util"

/** One-time cleanup of existing company names/slugs (fix mojibake + leading junk). */
async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true, slug: true } })
  let changed = 0
  const examples: string[] = []

  for (const c of companies) {
    const name = cleanCompanyName(c.name)
    if (name === c.name) continue

    // Recompute slug; only adopt the new slug if it's free.
    let slug = c.slug
    const newSlug = slugify(name)
    if (newSlug !== c.slug) {
      const clash = await prisma.company.findUnique({ where: { slug: newSlug }, select: { id: true } })
      if (!clash || clash.id === c.id) slug = newSlug
    }

    await prisma.company.update({ where: { id: c.id }, data: { name, slug } })
    changed++
    if (examples.length < 25) examples.push(`${JSON.stringify(c.name)} -> ${JSON.stringify(name)}`)
  }

  console.log(`Companies scanned: ${companies.length}, cleaned: ${changed}\n`)
  examples.forEach((e) => console.log("  " + e))
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
