import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

type AuditInput = {
  actorUserId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Prisma.InputJsonValue
  ipAddress?: string | null
}

/**
 * Append an immutable audit-log entry. Best-effort: a logging failure must never
 * break the underlying action, so errors are swallowed (and surfaced in dev).
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? null,
      },
    })
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[audit] failed to write log:", err)
    }
  }
}
