import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { handleChatMessage } from "@/lib/chat";
import { chatMessageSchema } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  const messages = await prisma.chatMessage.findMany({
    where: { userId: actor.sub },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return jsonOk({ messages });
}

export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  try {
    const result = await handleChatMessage(
      { id: actor.sub, role: actor.role, phone: actor.phone },
      {
        text: parsed.data.text,
        audioBase64: parsed.data.audioBase64,
        externalMessageId: parsed.data.externalMessageId ?? null,
        source: "chat",
      }
    );
    return jsonOk(result);
  } catch (e) {
    console.error("chat failed", e);
    return jsonError("Could not process that message. Please try again.", 500);
  }
}