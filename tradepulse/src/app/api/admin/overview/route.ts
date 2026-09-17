import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") return jsonError("Unauthorized", 401);

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const since14 = new Date(dayStart);
  since14.setDate(since14.getDate() - 13);
  const since30 = new Date(dayStart);
  since30.setDate(since30.getDate() - 29);

  const [users, tx30, tickets, recent, allTx14] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, role: true, status: true, consentBank: true, createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { status: "confirmed", timestamp: { gte: since30 } },
      select: { userId: true, type: true, total: true },
    }),
    prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.user.findMany({
      where: { role: "trader" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, ownerName: true, businessName: true, phone: true, createdAt: true, status: true, isVerified: true },
    }),
    prisma.transaction.findMany({
      where: { timestamp: { gte: since14 } },
      select: { timestamp: true, type: true, total: true, userId: true },
    }),
  ]);

  const traders = users.filter((u) => u.role === "trader");
  const series: { date: string; label: string; count: number; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(dayStart);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayTx = allTx14.filter((t) => t.timestamp >= d && t.timestamp < next);
    series.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" }),
      count: dayTx.length,
      revenue: round(dayTx.filter((t) => t.type === "sale").reduce((a, t) => a + t.total, 0)),
    });
  }

  const revenueTraders = new Map<string, number>();
  for (const t of tx30.filter((t) => t.type === "sale")) {
    revenueTraders.set(t.userId, (revenueTraders.get(t.userId) ?? 0) + t.total);
  }
  const topTraderIds = [...revenueTraders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topTraders = await prisma.user.findMany({
    where: { id: { in: topTraderIds.map(([id]) => id) } },
    select: { id: true, businessName: true, ownerName: true, location: true },
  });

  return jsonOk({
    stats: {
      totalUsers: users.length,
      traders: traders.length,
      activeTraders: traders.filter((u) => u.status === "active").length,
      distributors: users.filter((u) => u.role === "distributor").length,
      banks: users.filter((u) => u.role === "bank").length,
      admins: users.filter((u) => u.role === "admin").length,
      consentedBank: traders.filter((u) => u.consentBank).length,
      transactions30d: tx30.length,
      revenue30d: round(tx30.filter((t) => t.type === "sale").reduce((a, t) => a + t.total, 0)),
      openTickets: tickets.filter((t) => t.status !== "resolved").length,
      newTraders7d: traders.filter((u) => u.createdAt >= new Date(Date.now() - 7 * 86400000)).length,
    },
    series,
    topTraders: topTraderIds.map(([id, revenue]) => {
      const u = topTraders.find((x) => x.id === id);
      return {
        id,
        businessName: u?.businessName ?? "Trader",
        ownerName: u?.ownerName ?? "",
        location: u?.location ?? "",
        revenue30d: round(revenue),
      };
    }),
    recentTraders: recent,
    tickets,
  });
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}