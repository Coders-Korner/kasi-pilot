import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { promotionSchema } from "@/lib/validate";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.role !== "distributor") return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = promotionSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const targetIds = parsed.data.targetRetailerIds;
  const count = targetIds?.length
    ? await prisma.user.count({
        where: { id: { in: targetIds }, parentPartnerId: actor.sub, consentDistributor: true },
      })
    : await prisma.user.count({
        where: { parentPartnerId: actor.sub, role: "trader", consentDistributor: true },
      });

  const promotion = await prisma.promotion.create({
    data: {
      partnerId: actor.sub,
      title: parsed.data.title,
      product: parsed.data.product,
      discount: parsed.data.discount,
      message: parsed.data.message,
      targetCount: count,
    },
  });

  void logAudit(actor, "promotion.sent", {
    entity: "Promotion",
    entityId: promotion.id,
    detail: `${count} retailers targeted`,
  });

  return jsonOk({ promotion }, 201);
}