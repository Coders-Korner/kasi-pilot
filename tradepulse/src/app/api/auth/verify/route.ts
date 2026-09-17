import { NextRequest } from "next/server";
import { otpSchema } from "@/lib/validate";
import { prisma } from "@/lib/prisma";
import { verifyOtp, isOtpLocked, recordOtpFailure } from "@/lib/otp";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSessionCookie } from "@/lib/api-helpers";
import { signAuthChallenge } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { ROLE_HOME } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Verifies the OTP.
// - New registrations (isVerified = false) are auto-logged-in here.
// - Existing users get a short-lived pinTicket and must complete PIN entry.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = otpSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const ipRl = enforceRateLimit(req, {
    label: "auth.verify",
    limit: 20,
    windowMs: 60_000,
    key: parsed.data.phone,
    keyLimit: 10,
  });
  if (ipRl) return ipRl;

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user) return jsonError("Unknown phone", 404);

  if (isOtpLocked(user.phone)) return jsonError("Too many attempts. Try again in 15 minutes.", 429);

  if (!verifyOtp(user.phone, parsed.data.otp)) {
    recordOtpFailure(user.phone);
    if (isOtpLocked(user.phone)) {
      return jsonError("Too many attempts. Try again in 15 minutes.", 429);
    }
    return jsonError("Invalid or expired OTP", 401);
  }

  if (!user.isVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, lastLoginAt: new Date(), lastActiveAt: new Date() },
    });
    await createSessionCookie({ sub: user.id, phone: user.phone, role: user.role });
    void logAudit({ id: user.id, role: user.role, phone: user.phone }, "auth.register.verified", {
      entity: "User",
      entityId: user.id,
    });
    return jsonOk({ ok: true, registered: true, redirect: ROLE_HOME[user.role] || "/trader/chat" });
  }

  const pinTicket = await signAuthChallenge("pin", { sub: user.id, phone: user.phone });
  return jsonOk({ ok: true, requiresPin: true, pinTicket });
}