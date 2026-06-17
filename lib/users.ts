import bcrypt from "bcryptjs"
import type { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { writeAudit } from "@/lib/audit"

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}
function fail(error: string): Result<never> {
  return { ok: false, error }
}

/** Number of users who are admins and not disabled. Used to prevent locking out admin access. */
async function activeAdminCount(): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", disabled: false } })
}

export async function createUser(input: {
  actorId: string
  name: string
  email: string
  password: string
  role: Role
}): Promise<Result<{ id: string }>> {
  const email = input.email.toLowerCase().trim()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return fail("A user with that email already exists.")

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 10),
    },
  })

  await writeAudit({
    actorUserId: input.actorId,
    action: "user.create",
    entityType: "User",
    entityId: user.id,
    metadata: { email, role: input.role },
  })

  return ok({ id: user.id })
}

export async function updateUser(input: {
  actorId: string
  id: string
  name: string
  role: Role
}): Promise<Result<undefined>> {
  const target = await prisma.user.findUnique({ where: { id: input.id } })
  if (!target) return fail("User not found.")

  // Don't let an admin change their own role (would risk self-lockout).
  if (input.actorId === input.id && target.role !== input.role) {
    return fail("You can't change your own role.")
  }

  // Don't demote the last remaining active admin.
  if (target.role === "ADMIN" && input.role !== "ADMIN" && !target.disabled) {
    if ((await activeAdminCount()) <= 1) return fail("Can't remove the last active admin.")
  }

  await prisma.user.update({
    where: { id: input.id },
    data: { name: input.name.trim(), role: input.role },
  })

  await writeAudit({
    actorUserId: input.actorId,
    action: target.role !== input.role ? "user.role_change" : "user.update",
    entityType: "User",
    entityId: input.id,
    metadata: { name: input.name.trim(), role: input.role, previousRole: target.role },
  })

  return ok(undefined)
}

export async function setUserDisabled(input: {
  actorId: string
  id: string
  disabled: boolean
}): Promise<Result<undefined>> {
  if (input.actorId === input.id && input.disabled) {
    return fail("You can't disable your own account.")
  }

  const target = await prisma.user.findUnique({ where: { id: input.id } })
  if (!target) return fail("User not found.")

  // Don't disable the last remaining active admin.
  if (input.disabled && target.role === "ADMIN" && !target.disabled) {
    if ((await activeAdminCount()) <= 1) return fail("Can't disable the last active admin.")
  }

  await prisma.user.update({ where: { id: input.id }, data: { disabled: input.disabled } })

  await writeAudit({
    actorUserId: input.actorId,
    action: input.disabled ? "user.disable" : "user.enable",
    entityType: "User",
    entityId: input.id,
    metadata: { email: target.email },
  })

  return ok(undefined)
}

export async function deleteUser(input: { actorId: string; id: string }): Promise<Result<undefined>> {
  if (input.actorId === input.id) return fail("You can't delete your own account.")

  const target = await prisma.user.findUnique({ where: { id: input.id } })
  if (!target) return fail("User not found.")

  // Don't delete the last remaining active admin.
  if (target.role === "ADMIN" && !target.disabled) {
    if ((await activeAdminCount()) <= 1) return fail("Can't delete the last active admin.")
  }

  await prisma.user.delete({ where: { id: input.id } })

  await writeAudit({
    actorUserId: input.actorId,
    action: "user.delete",
    entityType: "User",
    entityId: input.id,
    metadata: { email: target.email },
  })

  return ok(undefined)
}
