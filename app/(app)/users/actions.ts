"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/session"
import {
  createUser as createUserRecord,
  updateUser as updateUserRecord,
  setUserDisabled as setUserDisabledRecord,
  deleteUser as deleteUserRecord,
  type Result,
} from "@/lib/users"
import { createUserSchema, updateUserSchema } from "@/lib/validations/user"

type ActionResult = { ok: true } | { ok: false; error: string }

function fromResult(result: Result<unknown>): ActionResult {
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

export async function createUserAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." }
  }

  const result = await createUserRecord({ actorId: admin.id, ...parsed.data })
  if (result.ok) revalidatePath("/users")
  return fromResult(result)
}

export async function updateUserAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = updateUserSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." }
  }

  const result = await updateUserRecord({ actorId: admin.id, ...parsed.data })
  if (result.ok) revalidatePath("/users")
  return fromResult(result)
}

export async function setUserDisabledAction(id: string, disabled: boolean): Promise<ActionResult> {
  const admin = await requireAdmin()
  const result = await setUserDisabledRecord({ actorId: admin.id, id, disabled })
  if (result.ok) revalidatePath("/users")
  return fromResult(result)
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const result = await deleteUserRecord({ actorId: admin.id, id })
  if (result.ok) revalidatePath("/users")
  return fromResult(result)
}
