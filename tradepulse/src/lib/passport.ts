import { prisma } from "@/lib/prisma";

export interface PassportData {
  businessName: string;
  ownerName: string;
  location: string;
  businessType: string;
  yearsInBusiness: number | null;
  sinceLabel: string;
  periodDays: number;
  totalRevenue: number;
  totalTransactions: number;
  avgMonthlyRevenue: number;
  consistencyScore: number;
  activeDays: number;
  revenueTrend: "up" | "flat" | "down";
  bestSelling: { productName: string; revenue: number; units: number }[];
  stockTurnover: { productName: string; turnover: number; note: string }[];
  generatedAt: Date;
}

const WORDY_NUMBERS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export async function computePassport(
  userId: string,
  periodDays = 180,
  persist = true
): Promise<PassportData> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  const transactions = await prisma.transaction.findMany({
    where: { userId, status: "confirmed", timestamp: { gte: since } },
    include: { product: true },
    orderBy: { timestamp: "asc" },
  });

  const sales = transactions.filter((t) => t.type === "sale");
  const totalRevenue = sales.reduce((a, t) => a + t.total, 0);
  const totalTransactions = transactions.length;

  const dailyActivity = new Map<string, number>();
  for (const t of transactions) {
    const d = t.timestamp.toISOString().slice(0, 10);
    dailyActivity.set(d, (dailyActivity.get(d) ?? 0) + 1);
  }
  const activeDays = dailyActivity.size;

  // Consistency measured over the last 30 days (matches "92%, missed 2 days" style metric).
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);
  const activeLast30 = [...dailyActivity.keys()].filter((d) => d >= monthStart.toISOString().slice(0, 10)).length;
  const consistencyScore = Math.min(100, Math.round((activeLast30 / 30) * 100));

  const periodMonths = Math.max(1, periodDays / 30);
  const avgMonthlyRevenue = around(totalRevenue / periodMonths);

  // Revenue trend: compare last 30 days against the 30 before it.
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
  const revLast30 = sales.filter((t) => t.timestamp >= d30).reduce((a, t) => a + t.total, 0);
  const revPrev30 = sales.filter((t) => t.timestamp >= d60 && t.timestamp < d30).reduce((a, t) => a + t.total, 0);
  const trend: "up" | "flat" | "down" = revPrev30 === 0 ? "flat" : revLast30 > revPrev30 * 1.05 ? "up" : revLast30 < revPrev30 * 0.95 ? "down" : "flat";

  // Best selling products
  const byProduct = new Map<string, { revenue: number; units: number }>();
  for (const t of sales) {
    const cur = byProduct.get(t.productName) ?? { revenue: 0, units: 0 };
    cur.revenue += t.total;
    cur.units += t.quantity;
    byProduct.set(t.productName, cur);
  }
  const bestSelling = [...byProduct.entries()]
    .map(([productName, v]) => ({ productName, revenue: v.revenue, units: v.units }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Stock turnover for products with stock
  const products = await prisma.product.findMany({ where: { userId } });
  const stockTurnover = products
    .map((p) => {
      const sold = sales.filter((t) => t.productId === p.id).reduce((a, t) => a + t.quantity, 0);
      const turnover = sold / Math.max(1, p.currentStock) / periodMonths;
      return { productName: p.name, turnover: round1(turnover), note: noteFor(turnover) };
    })
    .filter((s) => s.turnover > 0)
    .sort((a, b) => b.turnover - a.turnover)
    .slice(0, 6);

  const sinceLabel = `Verified trading activity over the last ${periodDays} days`;
  const generatedAt = new Date();

  // Snapshot for the bank portal
  if (persist) {
    await prisma.readinessSnapshot
      .create({
        data: {
          userId,
          periodDays,
          totalRevenue,
          totalTransactions,
          avgMonthlyRevenue,
          avgDailyRuns: activeDays,
          consistencyScore,
          revenueTrend: trend,
          stockTurnoverJson: JSON.stringify(stockTurnover),
          bestSellingJson: JSON.stringify(bestSelling),
        },
      })
      .catch((e) => console.error("snapshot save failed", e));
  }

  return {
    businessName: user.businessName || user.ownerName + "'s Business",
    ownerName: user.ownerName,
    location: user.location || "-",
    businessType: user.businessType || "-",
    yearsInBusiness: user.yearsInBusiness,
    sinceLabel,
    periodDays,
    totalRevenue: around(totalRevenue),
    totalTransactions,
    avgMonthlyRevenue,
    consistencyScore,
    activeDays,
    revenueTrend: trend,
    bestSelling,
    stockTurnover,
    generatedAt,
  };
}

function around(n: number): number {
  return Math.round(n * 100) / 100;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function noteFor(turnover: number): string {
  if (turnover >= 4) return "excellent";
  if (turnover >= 2.5) return "good";
  if (turnover >= 1.5) return "fair";
  return "slow";
}

export function consistencyLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  return "Low";
}

export function wordyCount(n: number): string {
  return n <= 10 ? WORDY_NUMBERS[n - 1] ?? String(n) : String(n);
}