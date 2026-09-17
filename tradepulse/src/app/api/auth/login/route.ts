import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validate";
import { prisma } from "@/lib/prisma";
import { createOtp, getDevOtp } from "@/lib/otp";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const ipRl = enforceRateLimit(req, {
    label: "auth.login",
    limit: 10,
    windowMs: 60_000,
    key: parsed.data.phone,
    keyLimit: 5,
  });
  if (ipRl) return ipRl;

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user) return jsonError("No account found for this phone. Please register first.", 404);
  if (user.status === "suspended") return jsonError("This account has been suspended. Contact support.", 403);

  createOtp(user.phone);
  return jsonOk({ ok: true, devOtp: getDevOtp(user.phone), expiresInSec: 300 });
}