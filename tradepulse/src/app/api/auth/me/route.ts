import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const actor = await getActor();
  if (!actor) return jsonError("Unauthorized", 401);
  const user = await prisma.user.findUnique({
    where: { id: actor.sub },
    select: {
      id: true,
      phone: true,
      ownerName: true,
      role: true,
      businessName: true,
      businessType: true,
      location: true,
      yearsInBusiness: true,
      isVerified: true,
      status: true,
      consentDistributor: true,
      consentBank: true,
      consentEsd: true,
      createdAt: true,
      lastActiveAt: true,
    },
  });
  if (!user) return jsonError("User not found", 404);
  return jsonOk({ user });
}