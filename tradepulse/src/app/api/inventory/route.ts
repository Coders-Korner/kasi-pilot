import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  const [products, movements] = await Promise.all([
    prisma.product.findMany({ where: { userId: actor.sub }, orderBy: { name: "asc" } }),
    prisma.stockMovement.findMany({
      where: { userId: actor.sub },
      orderBy: { timestamp: "desc" },
      take: 40,
      include: { product: { select: { name: true } } },
    }),
  ]);

  const items = products.map((p) => ({
    ...p,
    isLowStock: p.currentStock <= p.minStockThreshold,
    stockValue: p.currentStock * p.averagePrice,
  }));

  return jsonOk({
    products: items,
    movements: movements.map((m) => ({
      id: m.id,
      productName: m.product?.name ?? "Unknown",
      change: m.change,
      reason: m.reason,
      afterStock: m.afterStock,
      timestamp: m.timestamp,
    })),
    summary: {
      totalProducts: products.length,
      lowStock: items.filter((p) => p.isLowStock).length,
      stockValue: items.reduce((a, p) => a + p.stockValue, 0),
      totalUnits: products.reduce((a, p) => a + p.currentStock, 0),
    },
  });
}