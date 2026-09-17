import { NextRequest } from "next/server";
import { otpSchema } from "@/lib/validate";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { createSessionCookie } from "@/lib/api-helpers";
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

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user) return jsonError("Unknown phone", 404);

  if (!verifyOtp(user.phone, parsed.data.otp)) return jsonError("Invalid or expired OTP", 401);

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

  const pinTicket = createPinTicket(user.phone);
  return jsonOk({ ok: true, requiresPin: true, pinTicket });
}

function createPinTicket(phone: string): string {
  return Buffer.from(
    JSON.stringify({ phone, exp: Date.now() + 2 * 60 * 1000 })
  ).toString("base64");
}