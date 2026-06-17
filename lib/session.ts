import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import type { Role } from "@prisma/client"
import { authOptions } from "@/lib/auth"

export async function getSession() {
  return getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}

/** Require an authenticated user in a Server Component; redirect to /login otherwise. */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

/** Require a specific role; send unauthorized users to the dashboard. */
export async function requireRole(role: Role) {
  const user = await requireUser()
  if (user.role !== role) redirect("/dashboard")
  return user
}

export async function requireAdmin() {
  return requireRole("ADMIN")
}
