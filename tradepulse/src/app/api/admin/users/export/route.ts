import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, requireRole } from "@/lib/api-helpers";
import { enforceRateLimit } from "@/lib/rate-limit";
import { toCsv, csvResponse } from "@/lib/csv";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const actor = await getActor();
  const guard = requireRole(actor, ["admin"]);
  if (guard.error) return guard.error;

  const ipRl = enforceRateLimit(req, { label: "export.users", limit: 20, windowMs: 60_000 });
  if (ipRl) return ipRl;

  const url = new URL(req.url);
  const role = url.searchParams.get("role") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const q = url.searchParams.get("q")?.trim();

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { ownerName: { contains: q } },
              { businessName: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      phone: true,
      ownerName: true,
      businessName: true,
      businessType: true,
      location: true,
      role: true,
      status: true,
      isVerified: true,
      consentDistributor: true,
      consentBank: true,
      consentEsd: true,
      createdAt: true,
      lastActiveAt: true,
    },
  });

  const rows = users.map((u) => ({
    phone: u.phone,
    ownerName: u.ownerName,
    businessName: u.businessName,
    businessType: u.businessType,
    location: u.location,
    role: u.role,
    status: u.status,
    verified: u.isVerified,
    consentDistributor: u.consentDistributor,
    consentBank: u.consentBank,
    consentEsd: u.consentEsd,
    createdAt: u.createdAt,
    lastActiveAt: u.lastActiveAt,
  }));

  void logAudit({ id: actor!.id, role: actor!.role, phone: actor!.phone }, "data.export.users", {
    detail: JSON.stringify({ count: users.length, role: role ?? null, status: status ?? null, q: q ?? null }),
  });

  return csvResponse(toCsv(rows), `tradepulse-users-${new Date().toISOString().slice(0, 10)}.csv`);
}