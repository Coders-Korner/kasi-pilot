import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { consentUpdateSchema } from "@/lib/validate";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = consentUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const data = parsed.data;
  const user = await prisma.user.update({
    where: { id: actor.sub },
    data: {
      consentDistributor: data.consentDistributor,
      consentBank: data.consentBank,
      consentEsd: data.consentEsd,
      consentUpdatedAt: new Date(),
    },
    select: {
      consentDistributor: true,
      consentBank: true,
      consentEsd: true,
      consentUpdatedAt: true,
    },
  });

  const entries = Object.entries(data).filter(([, v]) => typeof v === "boolean") as [string, boolean][];
  for (const [purpose, granted] of entries) {
    await prisma.consent.create({
      data: { userId: actor.sub, purpose, granted },
    });
  }

  void logAudit(actor, "consent.change", {
    entity: "User",
    entityId: actor.sub,
    detail: JSON.stringify(data),
  });
  return jsonOk({ consents: user });
}