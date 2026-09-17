import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { bankPortfolio } from "@/lib/partner";

export const runtime = "nodejs";

// Bank / funder portal: only traders who consented to bank sharing are listed.
export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "bank") return jsonError("Unauthorized", 401);

  const portfolio = await bankPortfolio(actor.sub);
  return jsonOk(portfolio);
}