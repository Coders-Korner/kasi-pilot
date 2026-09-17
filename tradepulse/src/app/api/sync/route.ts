import { NextRequest } from "next/server";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { enforceRateLimit } from "@/lib/rate-limit";
import { syncBatchSchema } from "@/lib/validate";
import { commitTransaction } from "@/lib/transactions";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Batch endpoint for the offline-first PWA. Each item carries a stable localId
// which becomes externalMessageId for idempotent replay.
export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);

  const userRl = enforceRateLimit(req, {
    label: "sync",
    limit: 60,
    windowMs: 60_000,
    key: actor.sub,
  });
  if (userRl) return userRl;
  const ipRl = enforceRateLimit(req, { label: "sync", limit: 300, windowMs: 60_000 });
  if (ipRl) return ipRl;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = syncBatchSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const a = { id: actor.sub, role: actor.role, phone: actor.phone };
  const results: { localId: string; status: "synced" | "duplicate" | "error"; error?: string }[] = [];

  for (const item of parsed.data.transactions) {
    try {
      const res = await commitTransaction(
        a,
        {
          type: item.type,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        },
        {
          source: "sync",
          status: "confirmed",
          externalMessageId: item.localId,
          timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
        }
      );
      results.push({ localId: item.localId, status: res.duplicate ? "duplicate" : "synced" });
    } catch (e) {
      results.push({
        localId: item.localId,
        status: "error",
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  }

  const synced = results.filter((r) => r.status === "synced").length;
  void logAudit(a, "sync.batch", { detail: `${synced}/${results.length} items synced` });

  return jsonOk({
    ok: true,
    synced,
    duplicates: results.filter((r) => r.status === "duplicate").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  });
}