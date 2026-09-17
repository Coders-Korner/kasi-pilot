import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, jsonError, jsonOk } from "@/lib/api-helpers";
import { loanDecisionSchema } from "@/lib/validate";
import { computePassport } from "@/lib/passport";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const assessSchema = loanDecisionSchema.omit({ loanId: true }).extend({
  traderId: z.string().min(1),
  termMonths: z.number().int().min(1).max(120).default(12),
  amount: z.number().min(0).default(10000),
  decision: z.enum(["pending", "approved", "declined", "request_info"]).default("pending"),
});

export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.role !== "bank") return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const parsed = assessSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const trader = await prisma.user.findUnique({ where: { id: parsed.data.traderId } });
  if (!trader || trader.role !== "trader") return jsonError("Trader not found", 404);
  if (!trader.consentBank) return jsonError("Trader has not consented to bank data sharing", 403);

  const passport = await computePassport(trader.id, 180, false);
  const readinessScore = Math.round(
    passport.consistencyScore * 0.5 +
      Math.min(100, (passport.avgMonthlyRevenue / 10000) * 100) * 0.3 +
      Math.min(100, (passport.periodDays / 180) * 100) * 0.2
  );

  const assessment = await prisma.loanAssessment.create({
    data: {
      traderId: trader.id,
      bankId: actor.sub,
      amount: parsed.data.amount,
      termMonths: parsed.data.termMonths,
      readinessScore,
      decision: parsed.data.decision ?? "pending",
      note: parsed.data.note,
    },
  });

  void logAudit(actor, "loan.assessed", {
    entity: "LoanAssessment",
    entityId: assessment.id,
    detail: `trader=${trader.id} score=${readinessScore}`,
  });

  return jsonOk({ assessment, readinessScore }, 201);
}

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "bank") return jsonError("Unauthorized", 401);
  const assessments = await prisma.loanAssessment.findMany({
    where: { bankId: actor.sub },
    orderBy: { createdAt: "desc" },
    include: { trader: { select: { businessName: true, ownerName: true } } },
  });
  return jsonOk({ assessments });
}