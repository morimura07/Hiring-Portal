import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

/**
 * Seeds ONLY the login accounts. All company/job data is real and comes from
 * the ingestion pipeline (`pnpm ingest`) — no mock data.
 */
async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@portal.local").toLowerCase()
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!"
  const adminName = process.env.SEED_ADMIN_NAME ?? "Portal Admin"

  // Only the admin is seeded. Add the rest of the team from the in-app Users page.
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  })

  console.log(`Seeded admin: ${admin.email}`)
  console.log("Add other team members from Users. Run `pnpm ingest` (or Refresh) for job data.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
