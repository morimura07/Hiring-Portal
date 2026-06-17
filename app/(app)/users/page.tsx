import { requireAdmin } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { UsersTable, type UserRow } from "@/components/users/users-table"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const admin = await requireAdmin()

  const users = await prisma.user.findMany({
    orderBy: [{ disabled: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      disabled: true,
      avatarUrl: true,
      createdAt: true,
    },
  })

  const rows: UserRow[] = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }))

  return <UsersTable users={rows} currentUserId={admin.id} />
}
