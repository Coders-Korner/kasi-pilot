import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { ticketCreateSchema } from "@/lib/validate";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const actor = await getActor();
  if (!actor) return jsonError("Unauthorized", 401);
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: actor.sub },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk({ tickets });
}

export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = ticketCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: actor.sub,
      subject: parsed.data.subject,
      message: parsed.data.message,
      priority: parsed.data.priority,
      status: "open",
    },
  });
  void logAudit(actor, "ticket.created", { entity: "SupportTicket", entityId: ticket.id });
  return jsonOk({ ticket }, 201);
}