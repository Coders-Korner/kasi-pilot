import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { confirmPending } from "@/lib/transactions";
import { confirmSchema, correctionSchema } from "@/lib/validate";
import { correctTransaction } from "@/lib/transactions";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);
  const a = { id: actor.sub, role: actor.role, phone: actor.phone };

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }

  const action = (body as { action?: string })?.action;

  try {
    if (action === "correct") {
      const parsed = correctionSchema.safeParse(body);
      if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
      const result = await correctTransaction(a, parsed.data.transactionId, {
        type: parsed.data.type,
        productName: parsed.data.productName,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
      });
      // Remove the pending original so it is not double-counted.
      await prisma.transaction.deleteMany({
        where: { id: parsed.data.transactionId, userId: actor.sub, status: "pending" },
      });
      await prisma.chatMessage.create({
        data: {
          userId: actor.sub,
          role: "assistant",
          content: `Corrected and recorded: ${result.transaction.type} ${result.transaction.quantity} × ${result.transaction.productName} at R${result.transaction.unitPrice.toFixed(2)}. ✅`,
          kind: "transaction",
          transactionId: result.transaction.id,
        },
      });
      return jsonOk({ ok: true, transaction: result.transaction });
    }

    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    const confirmed = await confirmPending(a, parsed.data.transactionId);
    await logAudit(a, "transaction.confirmed", {
      entity: "Transaction",
      entityId: confirmed.id,
    });
    await prisma.chatMessage.create({
      data: {
        userId: actor.sub,
        role: "assistant",
        content: `Confirmed: ${confirmed.type} ${confirmed.quantity} × ${confirmed.productName} at R${confirmed.unitPrice.toFixed(2)} = R${confirmed.total.toFixed(2)}. ✅`,
        kind: "transaction",
        transactionId: confirmed.id,
      },
    });
    return jsonOk({ ok: true, transaction: confirmed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update transaction";
    return jsonError(message, 400);
  }
}