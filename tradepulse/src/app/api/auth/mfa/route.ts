import { NextRequest } from "next/server";
import { mfaChallengeSchema } from "@/lib/validate";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSessionCookie } from "@/lib/api-helpers";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { ROLE_HOME } from "@/lib/session";
import { verifyAuthChallenge } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Final step for admins with MFA enabled: verify the TOTP code and issue a session.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = mfaChallengeSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const ipRl = enforceRateLimit(req, { label: "auth.mfa", limit: 20, windowMs: 60_000 });
  if (ipRl) return ipRl;
  const phoneRl = enforceRateLimit(req, {
    label: "auth.mfa",
    limit: 10,
    windowMs: 60_000,
    key: parsed.data.phone,
  });
  if (phoneRl) return phoneRl;

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user) return jsonError("Unknown phone", 404);
  const mfaChallenge = await verifyAuthChallenge(parsed.data.mfaTicket, "mfa", user.phone);
  if (!mfaChallenge || mfaChallenge.sub !== user.id) return jsonError("PIN verification required", 401);
  if (user.status === "suspended") return jsonError("This account has been suspended.", 403);
  if (user.role !== "admin" || !user.mfaEnabled || !user.mfaSecret) {
    return jsonError("Two-factor verification is not enabled for this account.", 403);
  }

  if (!verifyTotp(user.mfaSecret, parsed.data.code)) {
    return jsonError("Invalid verification code. Try again.", 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
  });

  await createSessionCookie({ sub: user.id, phone: user.phone, role: user.role });

  void logAudit({ id: user.id, role: user.role, phone: user.phone }, "auth.login.mfa", {
    entity: "User",
    entityId: user.id,
  });

  return jsonOk({ ok: true, role: user.role, redirect: ROLE_HOME[user.role] || "/admin" });
}