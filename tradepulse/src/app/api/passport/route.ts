import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { computePassport } from "@/lib/passport";

export const runtime = "nodejs";

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "trader") return jsonError("Unauthorized", 401);
  try {
    const passport = await computePassport(actor.sub, 180);
    return jsonOk({ passport });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Could not build passport", 500);
  }
}