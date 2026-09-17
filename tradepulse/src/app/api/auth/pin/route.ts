import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { pinVerifySchema } from "@/lib/validate";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { createSessionCookie } from "@/lib/api-helpers";
import { ROLE_HOME } from "@/lib/session";
import { signAuthChallenge, verifyAuthChallenge } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Step 2 of login: PIN check. Admins with MFA enabled return mfaRequired=true
// instead of a session — the front end then posts a TOTP code to /api/auth/mfa.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = pinVerifySchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const ipRl = enforceRateLimit(req, {
    label: "auth.pin",
    limit: 20,
    windowMs: 60_000,
    key: parsed.data.phone,
    keyLimit: 10,
  });
  if (ipRl) return ipRl;

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user) return jsonError("Unknown phone", 404);
  const pinChallenge = await verifyAuthChallenge(parsed.data.pinTicket, "pin", user.phone);
  if (!pinChallenge || pinChallenge.sub !== user.id) return jsonError("OTP verification required", 401);
  if (user.status === "suspended") return jsonError("This account has been suspended.", 403);

  const match = await bcrypt.compare(parsed.data.pin, user.pinHash);
  if (!match) return jsonError("Incorrect PIN", 401);

  if (user.role === "admin" && user.mfaEnabled && user.mfaSecret) {
    const mfaTicket = await signAuthChallenge("mfa", { sub: user.id, phone: user.phone });
    return jsonOk({
      ok: true,
      mfaRequired: true,
      phone: user.phone,
      role: user.role,
      mfaTicket,
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
  });

  await createSessionCookie({
    sub: user.id,
    phone: user.phone,
    role: user.role,
  });

  void logAudit({ id: user.id, role: user.role, phone: user.phone }, "auth.login", {
    entity: "User",
    entityId: user.id,
  });

  return jsonOk({ ok: true, role: user.role, redirect: ROLE_HOME[user.role] || "/trader/chat" });
}