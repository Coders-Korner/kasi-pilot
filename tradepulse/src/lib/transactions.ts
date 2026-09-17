import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/audit";
import { logAudit } from "@/lib/audit";

export interface ParsedTx {
  type: "sale" | "purchase" | "adjustment";
  productName: string;
  quantity: number;
  unitPrice: number;
}

/** Business rules + DB write for a validated transaction. Runs in a transaction. */
export async function commitTransaction(
  actor: Actor,
  parsed: ParsedTx,
  opts: {
    rawMessage?: string | null;
    transcription?: string | null;
    confidence?: number | null;
    source?: string;
    status?: "confirmed" | "pending" | "corrected";
    externalMessageId?: string | null;
    correctedFromId?: string | null;
    timestamp?: Date;
  } = {}
) {
  if (parsed.quantity <= 0) throw new Error("Quantity must be greater than zero");
  if (parsed.unitPrice < 0) throw new Error("Unit price cannot be negative");
  if (!parsed.productName.trim()) throw new Error("Product name required");

  const status = opts.status ?? "confirmed";
  const applyStock = status !== "pending";

  return prisma.$transaction(async (tx) => {
    if (opts.externalMessageId) {
      const dup = await tx.transaction.findUnique({
        where: { externalMessageId: opts.externalMessageId },
      });
      if (dup) return { duplicate: true, transaction: dup, afterStock: 0, product: null };
    }

    const total = parsed.quantity * parsed.unitPrice;

    // Match / create product under this trader's catalogue (isolation via userId).
    let product = await tx.product.findFirst({
      where: { userId: actor.id, name: parsed.productName },
    });
    if (!product) {
      product = await tx.product.create({
        data: {
          userId: actor.id,
          name: parsed.productName,
          category: "General",
          currentStock: 0,
          minStockThreshold: 5,
          averagePrice: parsed.unitPrice,
        },
      });
    }

    if (parsed.unitPrice > 0) {
      await tx.product.update({
        where: { id: product.id },
        data: { averagePrice: parsed.unitPrice },
      });
    }

    const stockDelta =
      parsed.type === "purchase" || parsed.type === "adjustment" ? parsed.quantity : -parsed.quantity;
    const afterStock = Math.max(0, product.currentStock + stockDelta);

    if (applyStock) {
      await tx.stockMovement.create({
        data: {
          userId: actor.id,
          productId: product.id,
          change: stockDelta,
          reason: parsed.type === "adjustment" ? "stock_adjustment" : parsed.type,
          afterStock,
        },
      });
    }

    const transaction = await tx.transaction.create({
      data: {
        userId: actor.id,
        type: parsed.type,
        productId: product.id,
        productName: product.name,
        quantity: parsed.quantity,
        unitPrice: parsed.unitPrice,
        total,
        source: opts.source || "chat",
        rawMessage: opts.rawMessage ?? null,
        transcription: opts.transcription ?? null,
        confidence: opts.confidence ?? null,
        status,
        externalMessageId: opts.externalMessageId ?? null,
        correctedFromId: opts.correctedFromId ?? null,
        timestamp: opts.timestamp ?? new Date(),
      },
    });

    if (applyStock) {
      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: afterStock },
      });
    }

    await logAudit(actor, `transaction.${transaction.type}.${status}`, {
      entity: "Transaction",
      entityId: transaction.id,
      detail: `msg=${transaction.rawMessage?.slice(0, 300) ?? "manual"}`,
      tx,
    });

    return { duplicate: false, transaction, afterStock, product };
  }, { timeout: 20000, maxWait: 10000 });
}

/** Copy a pending/confirmed transaction with edits (correction workflow). */
export async function correctTransaction(actor: Actor, originalId: string, parsed: ParsedTx) {
  return commitTransaction(actor, parsed, {
    source: "chat",
    status: "corrected",
    correctedFromId: originalId,
  });
}

export async function confirmPending(actor: Actor, transactionId: string) {
  return prisma.$transaction(async (tx) => {
    const pending = await tx.transaction.findFirst({
      where: { id: transactionId, userId: actor.id },
    });
    if (!pending) throw new Error("Transaction not found");
    if (pending.status === "confirmed") return pending;

    // Apply stock + product updates now that the trader confirmed.
    const product = await tx.product.findFirst({
      where: { userId: actor.id, name: pending.productName },
    });
    const stockDelta =
      pending.type === "purchase" || pending.type === "adjustment"
        ? pending.quantity
        : -pending.quantity;
    let afterStock = 0;
    if (product) {
      afterStock = Math.max(0, product.currentStock + stockDelta);
      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: afterStock },
      });
      await tx.stockMovement.create({
        data: {
          userId: actor.id,
          productId: product.id,
          change: stockDelta,
          reason: `${pending.type}_confirmed`,
          afterStock,
        },
      });
    }

    const updated = await tx.transaction.update({
      where: { id: pending.id },
      data: { status: "confirmed" },
    });
    await logAudit(actor, "transaction.confirmed", {
      entity: "Transaction",
      entityId: updated.id,
      tx,
    });
    return updated;
  }, { timeout: 20000, maxWait: 10000 });
}

export async function getDaySummary(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = await prisma.transaction.findMany({
    where: { userId, status: "confirmed", timestamp: { gte: start } },
  });
  const revenue = rows.filter((r) => r.type === "sale").reduce((a, r) => a + r.total, 0);
  const expense = rows
    .filter((r) => r.type === "purchase" || r.type === "adjustment")
    .reduce((a, r) => a + r.total, 0);
  return {
    revenue,
    expense,
    transactions: rows.length,
    sales: rows.filter((r) => r.type === "sale").length,
  };
}