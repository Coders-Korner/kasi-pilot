import { prisma } from "@/lib/prisma";

// Accuracy / measurement report aligned with business canvas "Metrics".
// Model: confirmed = saved records, corrected = trader-corrected copies
// (correctedFromId), pending = awaiting trader confirmation, abandoned = pending
// prompts never confirmed within a week. Correction rate and engine mix are the
// headline numbers against the ≥90% correct-extraction target.

export interface AccuracyReport {
  windowDays: number;
  counts: {
    confirmed: number;
    pending: number;
    corrected: number;
    abandoned: number;
    lowConfidence: number;
    total: number;
  };
  rates: {
    correctionRate: number; // corrected / (confirmed + corrected + pending)
    pendingRate: number;
    abandonedRate: number;
    lowConfidenceRate: number;
  };
  avgConfidence: number | null;
  engines: { engine: string; count: number }[];
}

export async function getAccuracyReport(opts: {
  userId?: string;
  days?: number;
} = {}): Promise<AccuracyReport> {
  const days = opts.days ?? 30;
  const since = new Date(Date.now() - days * 86400000);
  const where = opts.userId ? { userId: opts.userId, timestamp: { gte: since } } : { timestamp: { gte: since } };

  const txns = await prisma.transaction.findMany({
    where,
    select: { status: true, confidence: true, timestamp: true },
  });
  const primary = txns.filter(
    (t) => t.status === "pending" || t.status === "confirmed" || t.status === "corrected"
  );

  const confirmed = primary.filter((t) => t.status === "confirmed").length;
  const pending = primary.filter((t) => t.status === "pending").length;
  const corrected = primary.filter((t) => t.status === "corrected").length;
  const total = primary.length;
  const abandoned = txns.filter(
    (t) => t.status === "pending" && t.timestamp.getTime() < Date.now() - 7 * 86400000
  ).length;
  const lowConfidence = primary.filter((t) => t.confidence === null || t.confidence < 0.85).length;

  const rated = primary.filter((t) => t.confidence !== null);
  const avgConfidence = rated.length
    ? Math.round((rated.reduce((a, t) => a + (t.confidence ?? 0), 0) / rated.length) * 100) / 100
    : null;

  const engineRows = await prisma.chatMessage.groupBy({
    by: ["engine"],
    where: {
      role: "assistant",
      engine: { not: null },
      createdAt: { gte: since },
      ...(opts.userId ? { userId: opts.userId } : {}),
    },
    _count: { _all: true },
  });

  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return {
    windowDays: days,
    counts: { confirmed, pending, corrected, abandoned, lowConfidence, total },
    rates: {
      correctionRate: pct(corrected),
      pendingRate: pct(pending),
      abandonedRate: pct(abandoned),
      lowConfidenceRate: pct(lowConfidence),
    },
    avgConfidence,
    engines: engineRows
      .map((r) => ({ engine: r.engine as string, count: r._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}