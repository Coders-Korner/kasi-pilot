import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { computePassport } from "@/lib/passport";

export const runtime = "nodejs";

// Consent-gated trader detail for distributors / banks / admin.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (!actor || !["distributor", "bank", "admin"].includes(actor.role)) {
    return jsonError("Unauthorized", 401);
  }

  const trader = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      ownerName: true,
      businessName: true,
      businessType: true,
      location: true,
      yearsInBusiness: true,
      lastActiveAt: true,
      consentDistributor: true,
      consentBank: true,
      parentPartnerId: true,
    },
  });
  if (!trader) return jsonError("Trader not found", 404);

  const permitted =
    actor.role === "admin" ||
    (actor.role === "distributor" && trader.parentPartnerId === actor.sub && trader.consentDistributor) ||
    (actor.role === "bank" && trader.consentBank);

  if (!permitted) {
    return jsonError("This trader has not shared data with you. Consent is required.", 403);
  }

  const passport = await computePassport(trader.id, 180, false);
  return jsonOk({ trader, passport });
}