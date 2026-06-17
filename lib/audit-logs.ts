import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const AUDIT_PAGE_SIZE = 30

export type AuditFilters = {
  action?: string
  q?: string
  page?: number
}

function buildWhere(filters: AuditFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {}
  if (filters.action) where.action = filters.action
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { actor: { email: { contains: q, mode: "insensitive" } } },
      { actor: { name: { contains: q, mode: "insensitive" } } },
    ]
  }
  return where
}

export async function getAuditLogs(filters: AuditFilters) {
  const where = buildWhere(filters)
  const page = Math.max(1, filters.page ?? 1)

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ])

  return {
    logs,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  }
}

/** Distinct actions present, for the filter dropdown. */
export async function getAuditActions(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  })
  return rows.map((r) => r.action)
}
