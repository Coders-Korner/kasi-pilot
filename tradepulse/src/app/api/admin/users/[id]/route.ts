import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const updateSchema = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  isVerified: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") return jsonError("Unauthorized", 401);

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return jsonError("User not found", 404);
  if (target.role === "admin") return jsonError("Admin accounts cannot be modified here", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const user = await prisma.user.update({
    where: { id: target.id },
    data: parsed.data,
    select: { id: true, status: true, isVerified: true },
  });

  void logAudit(actor, "admin.user.updated", {
    entity: "User",
    entityId: target.id,
    detail: JSON.stringify(parsed.data),
  });
  return jsonOk({ user });
}