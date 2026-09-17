"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Check,
  Loader2,
  Mic,
  MicOff,
  Pencil,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost } from "@/lib/client-api";
import { useOffline } from "@/components/offline-provider";
import { useSpeech } from "@/components/use-speech";
import { enqueueTransaction } from "@/lib/offline";
import { cn, timeAgo, uid } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind: string;
  transactionId?: string | null;
  createdAt: string;
}

const SUGGESTIONS = [
  "Sold 4 kotas at R35 each",
  "Bought 12 bread at R12 each",
  "Add 24 chips at R7",
  "Sold 6 cool drinks for R90",
];

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { online, refreshPending } = useOffline();
  const speech = useSpeech();
  const [text, setText] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [correcting, setCorrecting] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["chat"],
    queryFn: () => apiGet<{ messages: Message[] }>("/api/chat"),
  });

  const messages = useMemo(() => {
    const server = (data?.messages ?? []) as Message[];
    const seen = new Set(server.map((m) => m.id));
    return [...server, ...localMessages.filter((m) => !seen.has(m.id))];
  }, [data, localMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      apiPost<{ userMessage: Message; assistantMessage: Message }>("/api/chat", { text: message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
    onError: (err) => {
      setLocalMessages((m) => [
        ...m,
        {
          id: uid("err-"),
          role: "assistant",
          content: `Sorry, something went wrong: ${err instanceof Error ? err.message : "unknown error"}`,
          kind: "error",
          createdAt: new Date().toISOString(),
        },
      ]);
    },
  });

  const actionMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost("/api/chat/confirm", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setCorrecting(null);
    },
  });

  async function handleSend(overrideText?: string) {
    const message = (overrideText ?? text).trim();
    if (!message) return;
    setText("");

    const optimistic: Message = {
      id: uid("local-"),
      role: "user",
      content: message,
      kind: "text",
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((m) => [...m, optimistic]);

    if (!online) {
      // Offline-first: queue a best-effort parse locally.
      const parsed = quickParse(message);
      if (parsed) {
        await enqueueTransaction({
          localId: optimistic.id,
          type: parsed.type,
          productName: parsed.productName,
          quantity: parsed.quantity,
          unitPrice: parsed.unitPrice,
          timestamp: optimistic.createdAt,
        });
        await refreshPending();
        setLocalMessages((m) => [
          ...m,
          {
            id: uid("local-"),
            role: "assistant",
            content: `Saved offline: ${parsed.type} ${parsed.quantity} × ${parsed.productName}. It will sync automatically when you are back online.`,
            kind: "transaction",
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setLocalMessages((m) => [
          ...m,
          {
            id: uid("local-"),
            role: "assistant",
            content:
              "You are offline. I will record this once you reconnect — try “sold 4 kotas at R35 each”.",
            kind: "error",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      return;
    }

    sendMutation.mutate(message);
  }

  function confirmMessage(m: Message) {
    if (!m.transactionId) return;
    actionMutation.mutate({ transactionId: m.transactionId });
  }

  const busy = sendMutation.isPending || actionMutation.isPending;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="chat-bg flex-1 space-y-3 overflow-y-auto p-3 pb-4">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="flex justify-center">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur">
              <Sparkles className="mr-1 h-3 w-3" /> AI assistant • text & voice
            </Badge>
          </div>

          {isLoading ? (
            <p className="text-center text-xs text-muted-foreground">Loading conversation…</p>
          ) : null}

          {messages.length === 0 && !isLoading ? (
            <div className="rounded-2xl border bg-background/90 p-4 text-sm shadow-sm">
              <p className="font-medium">Sawubona! 👋 I am your TradePulse assistant.</p>
              <p className="mt-1 text-muted-foreground">
                Tell me about your sales and stock. For example:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void handleSend(s)}
                    className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              busy={busy}
              onConfirm={() => confirmMessage(m)}
              onCorrect={() => setCorrecting(m)}
            />
          ))}

          {busy && !actionMutation.isPending ? <TypingBubble /> : null}
        </div>
      </div>

      <div className="border-t bg-background p-3">
        <div className="mx-auto max-w-lg">
          {speech.listening ? (
            <div className="mb-2 rounded-xl border border-primary/30 bg-accent p-2 text-sm">
              <Mic className="mr-1 inline h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                {speech.transcript || "Listening… speak now"}
              </span>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={online ? "Type or use the mic…" : "Offline — messages will sync"}
              className="flex-1"
            />
            <Button
              variant={speech.listening ? "destructive" : "outline"}
              size="icon"
              type="button"
              aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
              onClick={() => {
                if (!speech.supported) {
                  setText((t) => t || "Voice not supported on this browser — please type.");
                  return;
                }
                if (speech.listening) {
                  speech.stop();
                } else {
                  speech.start();
                }
              }}
              disabled={!speech.supported && false}
              title={speech.supported ? "Voice note" : "Voice not supported"}
            >
              {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              type="button"
              aria-label="Send message"
              onClick={() => {
                if (speech.listening && speech.transcript) {
                  speech.stop();
                  void handleSend(speech.transcript);
                  return;
                }
                void handleSend();
              }}
              disabled={!text.trim() && !speech.transcript}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Tip: “sold 4 kotas at R35 each” or “bought 12 bread at R12 each”
          </p>
        </div>
      </div>

      {correcting ? (
        <CorrectDialog
          message={correcting}
          onClose={() => setCorrecting(null)}
          onSubmit={(payload) =>
            actionMutation.mutate({
              action: "correct",
              transactionId: correcting.transactionId,
              ...payload,
            })
          }
          busy={actionMutation.isPending}
        />
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  busy,
  onConfirm,
  onCorrect,
}: {
  message: Message;
  busy: boolean;
  onConfirm: () => void;
  onCorrect: () => void;
}) {
  const isUser = message.role === "user";
  const isConfirmation = message.kind === "confirmation";

  return (
    <div className={cn("flex animate-fade-in", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm shadow-sm",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-background text-foreground"
        )}
      >
        <p>{message.content}</p>

        {isConfirmation && message.transactionId ? (
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="success" onClick={onConfirm} disabled={busy}>
              <Check className="h-3.5 w-3.5" /> Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={onCorrect} disabled={busy}>
              <Pencil className="h-3.5 w-3.5" /> Correct
            </Button>
          </div>
        ) : null}

        <p
          className={cn(
            "mt-1 text-right text-[10px]",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {timeAgo(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-background px-4 py-3 shadow-sm">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-muted-foreground" />
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-muted-foreground [animation-delay:0.2s]" />
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-muted-foreground [animation-delay:0.4s]" />
      </div>
    </div>
  );
}

function CorrectDialog({
  message,
  onClose,
  onSubmit,
  busy,
}: {
  message: Message;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const [type, setType] = useState("sale");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border bg-background p-4 shadow-lg animate-slide-up">
        <h3 className="flex items-center gap-2 font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" /> Correct this entry
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{message.content}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium">Product</label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="sale">Sale</option>
              <option value="purchase">Purchase</option>
              <option value="adjustment">Stock adjustment</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Quantity</label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium">Unit price (R)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                type,
                productName: productName.trim(),
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
              })
            }
            disabled={busy || !productName.trim() || Number(quantity) < 1}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save correction
          </Button>
        </div>
      </div>
    </div>
  );
}

// Small client-side mirror of the server parser for offline capture.
function quickParse(message: string): {
  type: "sale" | "purchase" | "adjustment";
  productName: string;
  quantity: number;
  unitPrice: number;
} | null {
  const m = /\b(sold|reki)\b\s+(\d+)\s+([a-z][a-z ]+?)\s+(?:at|for|@)\s*(?:r\s?)?([0-9]+(?:\.[0-9]{1,2})?)/i.exec(
    message
  );
  if (m) {
    return {
      type: "sale",
      productName: m[3].replace(/\b(each)\b/gi, "").trim(),
      quantity: Number(m[2]),
      unitPrice: Number(m[4]),
    };
  }
  const b = /\b(bought)\b\s+(\d+)\s+([a-z][a-z ]+?)\s+(?:at|for|@)\s*(?:r\s?)?([0-9]+(?:\.[0-9]{1,2})?)/i.exec(
    message
  );
  if (b) {
    return {
      type: "purchase",
      productName: b[3].trim(),
      quantity: Number(b[2]),
      unitPrice: Number(b[4]),
    };
  }
  return null;
}