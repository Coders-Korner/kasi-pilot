import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { distributorOverview } from "@/lib/partner";

export const runtime = "nodejs";

// Distributor portal overview. Only retailers who granted distributor consent
// are visible (POPIA-style data minimisation).
export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "distributor") return jsonError("Unauthorized", 401);

  const overview = await distributorOverview(actor.sub);
  return jsonOk(overview);
}