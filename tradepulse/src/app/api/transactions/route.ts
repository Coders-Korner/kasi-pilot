import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { manualTransactionSchema } from "@/lib/validate";
import { commitTransaction } from "@/lib/transactions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const limit = Math.min(200, parseInt(url.searchParams.get("limit") || "50", 10));
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: actor.sub,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
  return jsonOk({ transactions });
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
  const parsed = manualTransactionSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  try {
    const result = await commitTransaction(
      { id: actor.sub, role: actor.role, phone: actor.phone },
      {
        type: parsed.data.type,
        productName: parsed.data.productName,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
      },
      {
        source: "web",
        status: "confirmed",
        timestamp: parsed.data.timestamp ? new Date(parsed.data.timestamp) : undefined,
      }
    );
    return jsonOk({ transaction: result.transaction, afterStock: result.afterStock }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Could not save transaction");
  }
}