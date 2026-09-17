import { NextRequest } from "next/server";
import { getActor, requireRole } from "@/lib/api-helpers";
import { enforceRateLimit } from "@/lib/rate-limit";
import { toCsv, csvResponse } from "@/lib/csv";
import { bankPortfolio } from "@/lib/partner";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const actor = await getActor();
  const guard = requireRole(actor, ["bank"]);
  if (guard.error) return guard.error;

  const ipRl = enforceRateLimit(req, { label: "export.bank", limit: 20, windowMs: 60_000 });
  if (ipRl) return ipRl;

  const { traders } = await bankPortfolio(actor!.sub);

  const rows = traders.map((r) => ({
    businessName: r.businessName,
    ownerName: r.ownerName,
    businessType: r.businessType,
    location: r.location,
    yearsInBusiness: r.yearsInBusiness ?? "",
    revenue6mo: r.revenue6mo,
    avgMonthlyRevenue: r.avgMonthlyRevenue,
    transactions6mo: r.transactions6mo,
    consistencyScore: r.consistencyScore,
    consistencyLabel: r.consistencyLabel,
    stockValue: r.stockValue,
    productCount: r.productCount,
    lastActiveAt: r.lastActiveAt,
    assessment: r.assessment?.decision ?? "",
    assessmentAmount: r.assessment?.amount ?? "",
  }));

  void logAudit({ id: actor!.id, role: actor!.role, phone: actor!.phone }, "data.export.portfolio", {
    detail: `${traders.length} traders exported`,
  });

  return csvResponse(toCsv(rows), `bank-portfolio-${new Date().toISOString().slice(0, 10)}.csv`);
}