import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";

export const runtime = "nodejs";

// Distributor portal overview. Only retailers who granted distributor consent
// are visible (POPIA-style data minimisation).
export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "distributor") return jsonError("Unauthorized", 401);

  const retailers = await prisma.user.findMany({
    where: { parentPartnerId: actor.sub, role: "trader", consentDistributor: true },
    select: {
      id: true,
      ownerName: true,
      businessName: true,
      businessType: true,
      location: true,
      lastActiveAt: true,
    },
  });

  const ids = retailers.map((r) => r.id);
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [txs, products, promotions] = await Promise.all([
    ids.length
      ? prisma.transaction.findMany({
          where: { userId: { in: ids }, status: "confirmed", timestamp: { gte: since } },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.product.findMany({ where: { userId: { in: ids } } })
      : Promise.resolve([]),
    prisma.promotion.findMany({
      where: { partnerId: actor.sub },
      orderBy: { sentAt: "desc" },
      take: 10,
    }),
  ]);

  const retailerRows = retailers.map((r) => {
    const rTx = txs.filter((t) => t.userId === r.id);
    const revenue = rTx.filter((t) => t.type === "sale").reduce((a, t) => a + t.total, 0);
    const rProducts = products.filter((p) => p.userId === r.id);
    return {
      ...r,
      revenue30d: round(revenue),
      orders30d: rTx.filter((t) => t.type === "sale").length,
      stockValue: round(rProducts.reduce((a, p) => a + p.currentStock * p.averagePrice, 0)),
      lowStockCount: rProducts.filter((p) => p.currentStock <= p.minStockThreshold).length,
      productCount: rProducts.length,
    };
  });

  const productAgg = new Map<string, { units: number; revenue: number }>();
  for (const t of txs.filter((t) => t.type === "sale")) {
    const cur = productAgg.get(t.productName) ?? { units: 0, revenue: 0 };
    cur.units += t.quantity;
    cur.revenue += t.total;
    productAgg.set(t.productName, cur);
  }
  const topProducts = [...productAgg.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 6);

  const reorderAlerts = products
    .filter((p) => p.currentStock <= p.minStockThreshold)
    .slice(0, 12)
    .map((p) => ({
      productName: p.name,
      traderId: p.userId,
      traderName: retailers.find((r) => r.id === p.userId)?.businessName ?? "Retailer",
      currentStock: p.currentStock,
      minStockThreshold: p.minStockThreshold,
    }));

  return jsonOk({
    stats: {
      retailers: retailers.length,
      activeRetailers: retailerRows.filter((r) => r.lastActiveAt && daysAgo(r.lastActiveAt) <= 7).length,
      revenue30d: round(retailerRows.reduce((a, r) => a + r.revenue30d, 0)),
      orders30d: retailerRows.reduce((a, r) => a + r.orders30d, 0),
      lowStockAlerts: reorderAlerts.length,
    },
    retailers: retailerRows.sort((a, b) => b.revenue30d - a.revenue30d),
    topProducts,
    reorderAlerts,
    promotions,
  });
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
function daysAgo(d: Date) {
  return (Date.now() - d.getTime()) / 86400000;
}