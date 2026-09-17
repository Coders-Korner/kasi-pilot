import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { ticketUpdateSchema } from "@/lib/validate";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = ticketUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const existing = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Ticket not found", 404);

  const ticket = await prisma.supportTicket.update({
    where: { id: params.id },
    data: parsed.data,
  });
  void logAudit(actor, "admin.ticket.updated", {
    entity: "SupportTicket",
    entityId: ticket.id,
    detail: JSON.stringify(parsed.data),
  });
  return jsonOk({ ticket });
}