import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { productSchema } from "@/lib/validate";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  const products = await prisma.product.findMany({
    where: { userId: actor.sub },
    orderBy: { name: "asc" },
  });
  const items = products.map((p) => ({
    ...p,
    isLowStock: p.currentStock <= p.minStockThreshold,
    value: p.currentStock * p.averagePrice,
  }));
  return jsonOk({ products: items });
}

export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  const existing = await prisma.product.findFirst({
    where: { userId: actor.sub, name: data.name },
  });
  if (existing) return jsonError("A product with this name already exists", 409);

  const product = await prisma.product.create({
    data: {
      userId: actor.sub,
      name: data.name,
      category: data.category,
      currentStock: data.currentStock,
      minStockThreshold: data.minStockThreshold,
      averagePrice: data.averagePrice ?? 0,
    },
  });
  if (product.currentStock > 0) {
    await prisma.stockMovement.create({
      data: {
        userId: actor.sub,
        productId: product.id,
        change: product.currentStock,
        reason: "opening_stock",
        afterStock: product.currentStock,
      },
    });
  }
  void logAudit(actor, "product.created", { entity: "Product", entityId: product.id });
  return jsonOk({ product }, 201);
}