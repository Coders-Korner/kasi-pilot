import { prisma } from "@/lib/prisma";
import { extractTransaction } from "@/lib/ai/extract";
import { commitTransaction } from "@/lib/transactions";
import { logAudit, type Actor } from "@/lib/audit";
import { formatZAR } from "@/lib/utils";

export interface ChatResult {
  userMessage: { id: string; content: string; createdAt: Date };
  assistantMessage: { id: string; content: string; kind: string; createdAt: Date };
  pendingTransactionId: string | null;
  engine: string;
  extraction: unknown;
}

const SALE_HINT = `I didn't catch that. Try something like:\n• "Sold 4 kotas at R35 each"\n• "Bought 2 boxes of bread at R60"`;

function verb(type: string): string {
  if (type === "sale") return "Sold";
  if (type === "purchase") return "Bought";
  return "Adjusted stock for";
}

export async function handleChatMessage(
  actor: Actor,
  input: { text?: string; audioBase64?: string; externalMessageId?: string | null; source?: string }
): Promise<ChatResult> {
  const userText = input.text?.trim() || "(voice note)";

  const userMessage = await prisma.chatMessage.create({
    data: { userId: actor.id, role: "user", content: userText, kind: "text" },
  });

  const products = await prisma.product.findMany({
    where: { userId: actor.id },
    select: { id: true, name: true },
  });

  const result = await extractTransaction({
    text: input.text,
    audioBase64: input.audioBase64,
    catalogue: products,
  });

  let assistantText: string;
  let kind = "text";
  let pendingTransactionId: string | null = null;

  if (!result.extracted) {
    assistantText = SALE_HINT;
    kind = "error";
  } else {
    const { extracted, matchedProduct, requiredConfirmation } = result;
    const total = extracted.quantity * extracted.unitPrice;
    const isNewProduct = matchedProduct === null;

    if (requiredConfirmation || extracted.unitPrice <= 0) {
      const created = await commitTransaction(
        actor,
        {
          type: extracted.type,
          productName: extracted.productName,
          quantity: extracted.quantity,
          unitPrice: extracted.unitPrice,
        },
        {
          rawMessage: input.text ?? null,
          transcription: result.transcription ?? null,
          confidence: extracted.confidence ?? null,
          status: "pending",
          source: input.source || "chat",
          externalMessageId: input.externalMessageId ?? null,
        }
      );
      pendingTransactionId = created.transaction.id;
      const priceLine = extracted.unitPrice > 0 ? ` at ${formatZAR(extracted.unitPrice)} each` : " (no price captured)";
      assistantText = `I think you ${
        extracted.type === "sale" ? "sold" : extracted.type === "purchase" ? "bought" : "adjusted"
      } ${extracted.quantity} × ${extracted.productName}${priceLine} = ${formatZAR(total)}.${
        isNewProduct ? `\n\n"${extracted.productName}" is not in your catalogue yet — confirming will add it.` : ""
      }\n\nTap Confirm to record it, or Correct to fix the details.`;
      kind = "confirmation";
    } else {
      const created = await commitTransaction(
        actor,
        {
          type: extracted.type,
          productName: extracted.productName,
          quantity: extracted.quantity,
          unitPrice: extracted.unitPrice,
        },
        {
          rawMessage: input.text ?? null,
          transcription: result.transcription ?? null,
          confidence: extracted.confidence ?? null,
          status: "confirmed",
          source: input.source || "chat",
          externalMessageId: input.externalMessageId ?? null,
        }
      );
      const after = created.afterStock;
      assistantText =
        `${verb(extracted.type)} ${extracted.quantity} × ${extracted.productName} at ${formatZAR(
          extracted.unitPrice
        )} = ${formatZAR(total)}. ✅\nStock on hand: ${after}.`;
      kind = "transaction";
    }
  }

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      userId: actor.id,
      role: "assistant",
      content: assistantText,
      kind,
      transactionId: pendingTransactionId,
      transcription: result.transcription ?? null,
      engine: result.engine,
    },
  });

  await prisma.user.update({
    where: { id: actor.id },
    data: { lastActiveAt: new Date() },
  });
  void logAudit(actor, "chat.message", { entity: "ChatMessage", entityId: userMessage.id });

  return {
    userMessage: { id: userMessage.id, content: userMessage.content, createdAt: userMessage.createdAt },
    assistantMessage: {
      id: assistantMessage.id,
      content: assistantMessage.content,
      kind: assistantMessage.kind,
      createdAt: assistantMessage.createdAt,
    },
    pendingTransactionId,
    engine: result.engine,
    extraction: result.extracted,
  };
}