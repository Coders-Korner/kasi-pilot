import { NextRequest } from "next/server";
import { getActor, requireRole } from "@/lib/api-helpers";
import { enforceRateLimit } from "@/lib/rate-limit";
import { toCsv, csvResponse } from "@/lib/csv";
import { distributorOverview } from "@/lib/partner";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const actor = await getActor();
  const guard = requireRole(actor, ["distributor"]);
  if (guard.error) return guard.error;

  const ipRl = enforceRateLimit(req, { label: "export.distributor", limit: 20, windowMs: 60_000 });
  if (ipRl) return ipRl;

  const { retailers } = await distributorOverview(actor!.sub);

  const rows = retailers.map((r) => ({
    businessName: r.businessName,
    ownerName: r.ownerName,
    businessType: r.businessType,
    location: r.location,
    revenue30d: r.revenue30d,
    orders30d: r.orders30d,
    stockValue: r.stockValue,
    lowStockCount: r.lowStockCount,
    productCount: r.productCount,
    lastActiveAt: r.lastActiveAt,
  }));

  void logAudit({ id: actor!.id, role: actor!.role, phone: actor!.phone }, "data.export.retailers", {
    detail: `${retailers.length} retailers exported`,
  });

  return csvResponse(
    toCsv(rows),
    `distributor-retailers-${new Date().toISOString().slice(0, 10)}.csv`
  );
}