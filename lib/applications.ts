import type { ApplicationStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { writeAudit } from "@/lib/audit"

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}
function fail(error: string): Result<never> {
  return { ok: false, error }
}

/**
 * Record an outreach attempt. Enforces the dedup rule — one application per
 * (company, user) — both up front and via the DB unique constraint (race-safe).
 */
export async function createApplication(input: {
  userId: string
  companyId: string
  jobPostingId?: string | null
  status?: ApplicationStatus
  channel?: string | null
  role?: string | null
  notes?: string | null
}): Promise<Result<{ id: string }>> {
  const company = await prisma.company.findUnique({ where: { id: input.companyId } })
  if (!company) return fail("Company not found.")

  try {
    const application = await prisma.application.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        jobPostingId: input.jobPostingId ?? null,
        status: input.status ?? "APPLIED",
        channel: input.channel ?? null,
        role: input.role ?? null,
        notes: input.notes ?? null,
      },
    })

    // Start a conversation thread for this outreach (Inbox).
    await prisma.conversation.create({
      data: {
        applicationId: application.id,
        companyId: input.companyId,
        subject: input.role?.trim() || `${company.name} outreach`,
      },
    })

    await writeAudit({
      actorUserId: input.userId,
      action: "application.create",
      entityType: "Application",
      entityId: application.id,
      metadata: { companyId: input.companyId, companyName: company.name },
    })

    return ok({ id: application.id })
  } catch (err) {
    // Unique violation on (companyId, userId) — already applied.
    if ((err as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
      return fail("You have already applied to this company.")
    }
    throw err
  }
}

/** Returns the set of company IDs (from the given list) the user has applied to. */
export async function getAppliedCompanyIds(userId: string, companyIds: string[]): Promise<Set<string>> {
  if (companyIds.length === 0) return new Set()
  const apps = await prisma.application.findMany({
    where: { userId, companyId: { in: companyIds } },
    select: { companyId: true },
  })
  return new Set(apps.map((a) => a.companyId))
}

export async function getUserApplications(userId: string, status?: ApplicationStatus) {
  return prisma.application.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { appliedAt: "desc" },
    include: {
      company: { select: { id: true, name: true, contacts: { where: { email: { not: null } }, take: 1 } } },
      jobPosting: { select: { title: true, applyUrl: true, salaryMin: true, salaryMax: true, currency: true, salaryText: true } },
      _count: { select: { conversations: true } },
    },
  })
}

/** Counts of the user's applications grouped by status. */
export async function getUserStatusCounts(userId: string): Promise<Record<string, number>> {
  const rows = await prisma.application.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  })
  const counts: Record<string, number> = {}
  for (const r of rows) counts[r.status] = r._count._all
  return counts
}

/** Load an application only if it belongs to the actor. */
async function loadOwned(actorId: string, id: string) {
  const app = await prisma.application.findUnique({ where: { id } })
  if (!app) return { ok: false as const, error: "Application not found." }
  if (app.userId !== actorId) return { ok: false as const, error: "This isn't your application." }
  return { ok: true as const, app }
}

export async function updateApplicationStatus(input: {
  actorId: string
  id: string
  status: ApplicationStatus
}): Promise<Result<undefined>> {
  const owned = await loadOwned(input.actorId, input.id)
  if (!owned.ok) return fail(owned.error)

  await prisma.application.update({ where: { id: input.id }, data: { status: input.status } })
  await writeAudit({
    actorUserId: input.actorId,
    action: "application.status_change",
    entityType: "Application",
    entityId: input.id,
    metadata: { from: owned.app.status, to: input.status },
  })
  return ok(undefined)
}

export async function updateApplicationDetails(input: {
  actorId: string
  id: string
  role?: string | null
  channel?: string | null
  notes?: string | null
}): Promise<Result<undefined>> {
  const owned = await loadOwned(input.actorId, input.id)
  if (!owned.ok) return fail(owned.error)

  await prisma.application.update({
    where: { id: input.id },
    data: {
      role: input.role?.trim() || null,
      channel: input.channel?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  })
  await writeAudit({
    actorUserId: input.actorId,
    action: "application.update",
    entityType: "Application",
    entityId: input.id,
  })
  return ok(undefined)
}

export async function deleteApplication(input: { actorId: string; id: string }): Promise<Result<undefined>> {
  const owned = await loadOwned(input.actorId, input.id)
  if (!owned.ok) return fail(owned.error)

  await prisma.application.delete({ where: { id: input.id } })
  await writeAudit({
    actorUserId: input.actorId,
    action: "application.withdraw",
    entityType: "Application",
    entityId: input.id,
    metadata: { companyId: owned.app.companyId },
  })
  return ok(undefined)
}
