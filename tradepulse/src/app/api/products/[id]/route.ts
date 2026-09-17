import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { productUpdateSchema } from "@/lib/validate";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  const existing = await prisma.product.findFirst({
    where: { id: params.id, userId: actor.sub },
  });
  if (!existing) return jsonError("Product not found", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const data = parsed.data;
  const opening = data.currentStock ?? existing.currentStock;
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      category: data.category,
      currentStock: opening,
      minStockThreshold: data.minStockThreshold,
      averagePrice: data.averagePrice,
    },
  });

  if (data.currentStock !== undefined && data.currentStock !== existing.currentStock) {
    const change = data.currentStock - existing.currentStock;
    await prisma.stockMovement.create({
      data: {
        userId: actor.sub,
        productId: product.id,
        change,
        reason: "manual_edit",
        afterStock: product.currentStock,
      },
    });
  }
  void logAudit(actor, "product.updated", { entity: "Product", entityId: product.id });
  return jsonOk({ product });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  const existing = await prisma.product.findFirst({
    where: { id: params.id, userId: actor.sub },
  });
  if (!existing) return jsonError("Product not found", 404);

  await prisma.product.delete({ where: { id: existing.id } });
  void logAudit(actor, "product.deleted", { entity: "Product", entityId: existing.id });
  return jsonOk({ ok: true });
}