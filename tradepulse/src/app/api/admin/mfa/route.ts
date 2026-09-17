import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/api-helpers";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { requireRole } from "@/lib/api-helpers";
import { generateSecret, otpauthUri, verifyTotp } from "@/lib/totp";
import { logAudit } from "@/lib/audit";

const mfaActionSchema = z.object({
  action: z.enum(["enroll", "confirm", "disable"]),
  code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits").optional(),
});

// GET → current MFA state. POST → enroll / confirm / disable TOTP for the admin.
export async function GET() {
  const actor = await getActor();
  const guard = requireRole(actor, ["admin"]);
  if (guard.error) return guard.error;

  const user = await prisma.user.findUnique({
    where: { id: actor!.id },
    select: { mfaEnabled: true, mfaSecret: true },
  });
  return jsonOk({ enabled: user?.mfaEnabled ?? false, pendingEnroll: Boolean(user?.mfaSecret) && !user?.mfaEnabled });
}

export async function POST(req: NextRequest) {
  const actor = await getActor();
  const guard = requireRole(actor, ["admin"]);
  if (guard.error) return guard.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = mfaActionSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  if (parsed.data.action !== "enroll" && !parsed.data.code) {
    return jsonError("Verification code is required");
  }

  const user = await prisma.user.findUnique({
    where: { id: actor!.id },
    select: { id: true, phone: true, role: true, mfaEnabled: true, mfaSecret: true },
  });
  if (!user) return jsonError("Unknown user", 404);

  if (parsed.data.action === "enroll") {
    if (user.mfaEnabled) return jsonError("Two-factor authentication is already enabled.", 400);
    const secret = generateSecret();
    await prisma.user.update({ where: { id: user.id }, data: { mfaSecret: secret } });
    return jsonOk({
      enabled: false,
      secret,
      otpauthUri: otpauthUri(secret, user.phone),
    });
  }

  if (!user.mfaSecret) return jsonError("No pending/active TOTP secret found.", 400);
  if (!verifyTotp(user.mfaSecret, parsed.data.code!)) {
    return jsonError("Invalid verification code. Try again.", 401);
  }

  if (parsed.data.action === "confirm") {
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
    void logAudit({ id: user.id, role: user.role, phone: user.phone }, "auth.mfa.enabled", {
      entity: "User",
      entityId: user.id,
    });
    return jsonOk({ enabled: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: null, mfaEnabled: false },
  });
  void logAudit({ id: user.id, role: user.role, phone: user.phone }, "auth.mfa.disabled", {
    entity: "User",
    entityId: user.id,
  });
  return jsonOk({ enabled: false });
}