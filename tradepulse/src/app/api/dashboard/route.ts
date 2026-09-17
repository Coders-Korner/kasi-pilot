import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { getDaySummary } from "@/lib/transactions";

export const runtime = "nodejs";

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  const userId = actor.sub;
  const now = new Date();

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(dayStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 13);
  const monthStart = new Date(dayStart);
  monthStart.setDate(monthStart.getDate() - 29);

  const [today, recent, monthTx, products, pendingCount] = await Promise.all([
    getDaySummary(userId),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 6,
    }),
    prisma.transaction.findMany({
      where: { userId, status: "confirmed", timestamp: { gte: monthStart } },
    }),
    prisma.product.findMany({ where: { userId } }),
    prisma.transaction.count({ where: { userId, status: "pending" } }),
  ]);

  // 7-day revenue + profit series
  const series = [] as { date: string; label: string; revenue: number; expense: number; profit: number }[];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(dayStart);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayTx = monthTx.filter((t) => t.timestamp >= d && t.timestamp < next);
    const revenue = dayTx.filter((t) => t.type === "sale").reduce((a, t) => a + t.total, 0);
    const expense = dayTx
      .filter((t) => t.type !== "sale")
      .reduce((a, t) => a + t.total, 0);
    series.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-ZA", { weekday: "short" }),
      revenue,
      expense,
      profit: revenue - expense,
    });
  }

  const salesMonth = monthTx.filter((t) => t.type === "sale");
  const revenueMonth = salesMonth.reduce((a, t) => a + t.total, 0);
  const expensesMonth = monthTx.filter((t) => t.type !== "sale").reduce((a, t) => a + t.total, 0);

  // top products last 30 days
  const byProduct = new Map<string, { revenue: number; units: number }>();
  for (const t of salesMonth) {
    const cur = byProduct.get(t.productName) ?? { revenue: 0, units: 0 };
    cur.revenue += t.total;
    cur.units += t.quantity;
    byProduct.set(t.productName, cur);
  }
  const topProducts = [...byProduct.entries()]
    .map(([name, v]) => ({ name, revenue: v.revenue, units: v.units }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const lowStock = products
    .filter((p) => p.currentStock <= p.minStockThreshold)
    .map((p) => ({ id: p.id, name: p.name, currentStock: p.currentStock, minStockThreshold: p.minStockThreshold }));

  // week over week
  const thisWeek = monthTx
    .filter((t) => t.timestamp >= weekStart && t.type === "sale")
    .reduce((a, t) => a + t.total, 0);
  const prevWeek = monthTx
    .filter((t) => t.timestamp >= prevWeekStart && t.timestamp < weekStart && t.type === "sale")
    .reduce((a, t) => a + t.total, 0);
  const wowChange = prevWeek === 0 ? null : Math.round(((thisWeek - prevWeek) / prevWeek) * 100);
  const bestDay = [...series].sort((a, b) => b.revenue - a.revenue)[0];

  let insight = `You recorded ${salesMonth.length} sales in the last 30 days.`;
  if (wowChange !== null) {
    insight =
      wowChange >= 0
        ? `Sales are up ${wowChange}% versus last week. Keep the momentum going!`
        : `Sales are down ${Math.abs(wowChange)}% versus last week. Consider a promo on your best sellers.`;
  }
  if (bestDay && bestDay.revenue > 0) {
    insight += ` Your best day was ${bestDay.label} (${new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(bestDay.revenue)}).`;
  }
  if (lowStock.length > 0) {
    insight += ` ${lowStock.length} product${lowStock.length > 1 ? "s" : ""} low on stock.`;
  }

  return jsonOk({
    today,
    series,
    topProducts,
    lowStock,
    recent: recent.map((t) => ({
      id: t.id,
      type: t.type,
      productName: t.productName,
      quantity: t.quantity,
      unitPrice: t.unitPrice,
      total: t.total,
      timestamp: t.timestamp,
      status: t.status,
    })),
    stats: {
      revenueMonth: Math.round(revenueMonth * 100) / 100,
      expensesMonth: Math.round(expensesMonth * 100) / 100,
      profitMonth: Math.round((revenueMonth - expensesMonth) * 100) / 100,
      salesCount: salesMonth.length,
      transactionsMonth: monthTx.length,
      wowChange,
      pendingCount,
      stockValue: Math.round(products.reduce((a, p) => a + p.currentStock * p.averagePrice, 0) * 100) / 100,
      productCount: products.length,
    },
    insight,
  });
}