import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validate";
import { prisma } from "@/lib/prisma";
import { createOtp, getDevOtp } from "@/lib/otp";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existing) return jsonError("An account with this phone already exists. Please log in.", 409);

  const pinHash = await bcrypt.hash(data.pin, 10);

  const user = await prisma.user.create({
    data: {
      phone: data.phone,
      pinHash,
      ownerName: data.ownerName,
      role: "trader",
      businessName: data.businessName,
      businessType: data.businessType,
      location: data.location,
      yearsInBusiness: data.yearsInBusiness,
      status: "active",
    },
  });

  // Skip OTP for dev UX granularity: register returns the OTP up-front.
  createOtp(user.phone);
  void logAudit({ id: user.id, role: user.role, phone: user.phone }, "auth.register");

  return jsonOk({
    ok: true,
    phone: user.phone,
    devOtp: getDevOtp(user.phone),
    expiresInSec: 300,
  });
}