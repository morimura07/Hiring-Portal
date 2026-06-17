"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import type { ApplicationStatus } from "@prisma/client"
import { requireUser } from "@/lib/session"
import {
  updateApplicationStatus,
  updateApplicationDetails,
  deleteApplication,
  type Result,
} from "@/lib/applications"
import { APPLICATION_STATUSES } from "@/lib/format"

type ActionResult = { ok: true } | { ok: false; error: string }

function fromResult(r: Result<unknown>): ActionResult {
  return r.ok ? { ok: true } : { ok: false, error: r.error }
}

export async function updateStatusAction(id: string, status: string): Promise<ActionResult> {
  const user = await requireUser()
  if (!(APPLICATION_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Invalid status." }
  }
  const result = await updateApplicationStatus({
    actorId: user.id,
    id,
    status: status as ApplicationStatus,
  })
  if (result.ok) {
    revalidatePath("/applications")
    revalidatePath("/dashboard")
  }
  return fromResult(result)
}

export async function updateApplicationAction(input: {
  id: string
  role?: string
  channel?: string
  notes?: string
}): Promise<ActionResult> {
  const user = await requireUser()
  const result = await updateApplicationDetails({
    actorId: user.id,
    id: input.id,
    role: input.role,
    channel: input.channel,
    notes: input.notes,
  })
  if (result.ok) revalidatePath("/applications")
  return fromResult(result)
}

export async function withdrawApplicationAction(id: string): Promise<ActionResult> {
  const user = await requireUser()
  const result = await deleteApplication({ actorId: user.id, id })
  if (result.ok) {
    revalidatePath("/applications")
    revalidatePath("/companies")
    revalidatePath("/dashboard")
  }
  return fromResult(result)
}
