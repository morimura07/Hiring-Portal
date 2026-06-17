"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { writeAudit } from "@/lib/audit"

type ActionResult = { ok: true } | { ok: false; error: string }

export async function updateProfileAction(input: { name: string; bio: string }): Promise<ActionResult> {
  const user = await requireUser()
  const name = input.name.trim()
  if (!name) return { ok: false, error: "Name is required." }
  if (name.length > 120) return { ok: false, error: "Name is too long." }

  await prisma.user.update({
    where: { id: user.id },
    data: { name, bio: input.bio.trim() || null },
  })
  await writeAudit({ actorUserId: user.id, action: "profile.update", entityType: "User", entityId: user.id })
  revalidatePath("/profile")
  return { ok: true }
}

export async function changePasswordAction(input: {
  currentPassword: string
  newPassword: string
}): Promise<ActionResult> {
  const user = await requireUser()
  if (input.newPassword.length < 8) return { ok: false, error: "New password must be at least 8 characters." }

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!record) return { ok: false, error: "User not found." }

  const valid = await bcrypt.compare(input.currentPassword, record.passwordHash)
  if (!valid) return { ok: false, error: "Current password is incorrect." }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(input.newPassword, 10) },
  })
  await writeAudit({ actorUserId: user.id, action: "profile.password", entityType: "User", entityId: user.id })
  return { ok: true }
}
