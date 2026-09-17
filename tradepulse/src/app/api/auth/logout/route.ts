import { destroySessionCookie } from "@/lib/api-helpers";
import { jsonOk } from "@/lib/api-helpers";
import { getActor } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const actor = await getActor();
  if (actor) void logAudit(actor, "auth.logout");
  await destroySessionCookie();
  return jsonOk({ ok: true });
}