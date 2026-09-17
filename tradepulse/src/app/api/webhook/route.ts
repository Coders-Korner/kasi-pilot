import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { handleChatMessage } from "@/lib/chat";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { z } from "zod";

export const runtime = "nodejs";

// Simulated WhatsApp/Business API webhook. In production this would verify the
// Meta X-Hub-Signature-256 header; here we sign with SESSION_SECRET so the
// integration path (external provider -> TradePulse) is demonstrated end to end.
const webhookSchema = z.object({
  phone: z.string().min(9).max(15),
  text: z.string().min(1).max(2000),
  messageId: z.string().min(1).max(120),
});

function expectedSignature(body: string): string {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "dev-secret-change-me")
    .update(body)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-tradepulse-signature") || "";

  const a = Buffer.from(expectedSignature(raw));
  const b = Buffer.from(signature);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valid) return jsonError("Invalid signature", 401);

  let parsed;
  try {
    parsed = webhookSchema.parse(JSON.parse(raw));
  } catch {
    return jsonError("Invalid payload");
  }

  const user = await prisma.user.findUnique({ where: { phone: parsed.phone } });
  if (!user || user.role !== "trader") return jsonError("Unknown sender", 404);

  const result = await handleChatMessage(
    { id: user.id, role: user.role, phone: user.phone },
    { text: parsed.text, externalMessageId: parsed.messageId, source: "webhook" }
  );

  return jsonOk({
    ok: true,
    to: parsed.phone,
    reply: result.assistantMessage.content,
    engine: result.engine,
    pending: Boolean(result.pendingTransactionId),
  });
}