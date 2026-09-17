import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { consistencyLabel } from "@/lib/passport";

export const runtime = "nodejs";

// Bank / funder portal: only traders who consented to bank sharing are listed.
export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "bank") return jsonError("Unauthorized", 401);

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
      : Promise.resolve([]),
    ids.length ? prisma.product.findMany({ where: { userId: { in: ids } } }) : Promise.resolve([]),
    prisma.loanAssessment.findMany({
      where: { bankId: actor.sub },
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
  return jsonOk({
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
  });
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}