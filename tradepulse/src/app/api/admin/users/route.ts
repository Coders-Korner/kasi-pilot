import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") return jsonError("Unauthorized", 401);

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
    take: 200,
    select: {
      id: true,
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
  return jsonOk({ users });
}