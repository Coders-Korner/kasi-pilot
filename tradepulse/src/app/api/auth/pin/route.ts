import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { pinVerifySchema } from "@/lib/validate";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { createSessionCookie } from "@/lib/api-helpers";
import { ROLE_HOME } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Step 2 of login: PIN check.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = pinVerifySchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user) return jsonError("Unknown phone", 404);

  const match = await bcrypt.compare(parsed.data.pin, user.pinHash);
  if (!match) return jsonError("Incorrect PIN", 401);

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