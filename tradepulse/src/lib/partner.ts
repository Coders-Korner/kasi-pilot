import { prisma } from "@/lib/prisma";
import { consistencyLabel } from "@/lib/passport";

// Shared query builders used by both the partner portal overviews and the CSV
// export endpoints, keeping consent gating and metric definitions in one place.

function round(n: number) {
  return Math.round(n * 100) / 100;
}

type Tx = {
  id: string;
  userId: string;
  type: string;
  total: number;
  quantity: number;
  productName: string;
  status: string;
  timestamp: Date;
};
type Prod = {
  id: string;
  userId: string;
  name: string;
  currentStock: number;
  averagePrice: number;
  minStockThreshold: number;
};

export async function distributorOverview(partnerId: string) {
  const retailers = await prisma.user.findMany({
    where: { parentPartnerId: partnerId, role: "trader", consentDistributor: true },
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
      : ([] as Tx[]),
    ids.length
      ? prisma.product.findMany({ where: { userId: { in: ids } } })
      : ([] as Prod[]),
    prisma.promotion.findMany({
      where: { partnerId },
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

  return {
    stats: {
      retailers: retailers.length,
      activeRetailers: retailerRows.filter(
        (r) => r.lastActiveAt && (Date.now() - r.lastActiveAt.getTime()) / 86400000 <= 7
      ).length,
      revenue30d: round(retailerRows.reduce((a, r) => a + r.revenue30d, 0)),
      orders30d: retailerRows.reduce((a, r) => a + r.orders30d, 0),
      lowStockAlerts: reorderAlerts.length,
    },
    retailers: retailerRows.sort((a, b) => b.revenue30d - a.revenue30d),
    topProducts,
    reorderAlerts,
    promotions,
  };
}

export async function bankPortfolio(bankId: string) {
  const traders = await prisma.user.findMany({
    where: { role: "trader", consentBank: true },
    select: {
      id: true,
      ownerName: true,
      businessName: true,
      businessType: true,
      location: true,
      yearsInBusiness: true,
      lastActiveAt: true,
    },
  });

  const ids = traders.map((t) => t.id);
  const since = new Date();
  since.setDate(since.getDate() - 180);

  const [txs, products, assessments] = await Promise.all([
    ids.length
      ? prisma.transaction.findMany({
          where: { userId: { in: ids }, status: "confirmed", timestamp: { gte: since } },
        })
      : ([] as Tx[]),
    ids.length ? prisma.product.findMany({ where: { userId: { in: ids } } }) : ([] as Prod[]),
    prisma.loanAssessment.findMany({
      where: { bankId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const rows = traders.map((t) => {
    const rTx = txs.filter((x) => x.userId === t.id);
    const sales = rTx.filter((x) => x.type === "sale");
    const revenue = sales.reduce((a, x) => a + x.total, 0);
    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);
    const days = new Set(
      rTx.filter((x) => x.timestamp >= monthStart).map((x) => x.timestamp.toISOString().slice(0, 10))
    );
    const consistency = Math.min(100, Math.round((days.size / 30) * 100));
    const avgMonthly = round(revenue / 6);
    const tProducts = products.filter((p) => p.userId === t.id);
    const assessment = assessments.find((a) => a.traderId === t.id);
    return {
      ...t,
      revenue6mo: round(revenue),
      avgMonthlyRevenue: avgMonthly,
      transactions6mo: rTx.length,
      consistencyScore: consistency,
      consistencyLabel: consistencyLabel(consistency),
      stockValue: round(tProducts.reduce((a, p) => a + p.currentStock * p.averagePrice, 0)),
      productCount: tProducts.length,
      assessment: assessment
        ? { id: assessment.id, decision: assessment.decision, amount: assessment.amount, createdAt: assessment.createdAt }
        : null,
    };
  });

  const totalPortfolio = rows.reduce((a, r) => a + r.revenue6mo, 0);
  return {
    stats: {
      traders: rows.length,
      totalRevenue6mo: round(totalPortfolio),
      avgMonthlyRevenue: round(totalPortfolio / Math.max(1, rows.length) / 6),
      highPotential: rows.filter((r) => r.consistencyScore >= 50 && r.avgMonthlyRevenue >= 3000).length,
      assessed: assessments.length,
      approved: assessments.filter((a) => a.decision === "approved").length,
    },
    traders: rows.sort((a, b) => b.revenue6mo - a.revenue6mo),
    assessments: assessments.map((a) => ({
      ...a,
      traderName: traders.find((t) => t.id === a.traderId)?.businessName ?? "Trader",
    })),
  };
}