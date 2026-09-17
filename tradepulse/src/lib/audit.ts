import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type Actor = { id: string; role: string; phone: string };

export type DbClient = Prisma.TransactionClient;

export async function logAudit(
  actor: Actor,
  action: string,
  opts?: { entity?: string; entityId?: string; detail?: string; tx?: DbClient }
) {
  try {
    const db = opts?.tx ?? prisma;
    await db.auditLog.create({
      data: {
        userId: actor.id,
        action,
        entity: opts?.entity,
        entityId: opts?.entityId,
        detail: opts?.detail ? String(opts.detail).slice(0, 1000) : undefined,
      },
    });
  } catch (e) {
    // Audit must never break the primary flow.
    console.error("audit failed", e);
  }
}