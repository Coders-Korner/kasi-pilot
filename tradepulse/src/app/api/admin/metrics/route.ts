import { getActor, requireRole, jsonOk } from "@/lib/api-helpers";
import { getAccuracyReport } from "@/lib/metrics";

export const runtime = "nodejs";

export async function GET() {
  const actor = await getActor();
  const guard = requireRole(actor, ["admin"]);
  if (guard.error) return guard.error;

  const report = await getAccuracyReport({ days: 30 });
  return jsonOk({ report });
}