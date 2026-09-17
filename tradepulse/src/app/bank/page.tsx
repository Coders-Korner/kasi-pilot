"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ClipboardCheck, Loader2, PiggyBank, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Stat } from "@/components/ui/primitives";
import { apiGet, apiPost } from "@/lib/client-api";
import { ExportButton } from "@/components/export-button";
import { formatZAR, timeAgo } from "@/lib/utils";

interface BankTrader {
  id: string;
  businessName: string;
  ownerName: string;
  location: string;
  yearsInBusiness: number | null;
  revenue6mo: number;
  avgMonthlyRevenue: number;
  transactions6mo: number;
  consistencyScore: number;
  consistencyLabel: string;
  stockValue: number;
  productCount: number;
  lastActiveAt: string | null;
  assessment: { id: string; decision: string; amount: number; createdAt: string } | null;
}

interface BankData {
  stats: {
    traders: number;
    totalRevenue6mo: number;
    avgMonthlyRevenue: number;
    highPotential: number;
    assessed: number;
    approved: number;
  };
  traders: BankTrader[];
}

export default function BankPipelinePage() {
  const queryClient = useQueryClient();
  const [assessing, setAssessing] = useState<BankTrader | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["bank"],
    queryFn: () => apiGet<BankData>("/api/partner/bank"),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { stats, traders } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Funding pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Traders who consented to share their TradePulse passport with lenders.
          </p>
        </div>
        <ExportButton path="/api/partner/bank/export" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Consented traders" value={stats.traders} icon={<Users className="h-4 w-4" />} />
        <Stat label="Pipeline revenue (6mo)" value={formatZAR(stats.totalRevenue6mo)} icon={<PiggyBank className="h-4 w-4" />} tone="success" />
        <Stat label="High potential" value={stats.highPotential} hint="Consistent + R3k+/mo" icon={<ClipboardCheck className="h-4 w-4" />} />
        <Stat label="Assessed / approved" value={`${stats.assessed} / ${stats.approved}`} icon={<BadgeCheck className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Traders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {traders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No traders have consented to bank sharing.</p>
          ) : (
            traders.map((t) => (
              <div key={t.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{t.businessName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.ownerName} · {t.location} · {t.yearsInBusiness ?? 0} yrs
                    </p>
                  </div>
                  {t.assessment ? (
                    <Badge
                      className="shrink-0 capitalize"
                      variant={
                        t.assessment.decision === "approved"
                          ? "success"
                          : t.assessment.decision === "declined"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {t.assessment.decision.replace("_", " ")}
                    </Badge>
                  ) : (
                    <Button size="sm" className="shrink-0" onClick={() => setAssessing(t)}>
                      <ClipboardCheck className="h-3.5 w-3.5" /> Assess
                    </Button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <div>
                    <p className="font-semibold">{formatZAR(t.avgMonthlyRevenue)}</p>
                    <p className="text-xs text-muted-foreground">
                      avg /mo · {t.transactions6mo} records
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">{t.consistencyScore}%</p>
                    <p className="text-xs text-muted-foreground">{t.consistencyLabel} consistency</p>
                  </div>
                  <div>
                    <p className="font-semibold">{formatZAR(t.stockValue)}</p>
                    <p className="text-xs text-muted-foreground">{t.productCount} products</p>
                  </div>
                  <div>
                    <p className="font-semibold tabular-nums">{formatZAR(t.revenue6mo)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.lastActiveAt ? `active ${timeAgo(t.lastActiveAt)}` : "no recent activity"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {assessing ? (
        <AssessDialog
          trader={assessing}
          onClose={() => setAssessing(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["bank"] });
            setAssessing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function AssessDialog({
  trader,
  onClose,
  onSaved,
}: {
  trader: BankTrader;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("25000");
  const [term, setTerm] = useState("18");
  const [decision, setDecision] = useState("pending");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiPost("/api/partner/bank/assess", {
        traderId: trader.id,
        amount: Number(amount),
        termMonths: Number(term),
        decision,
        note,
      }),
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="w-full max-w-md rounded-2xl border bg-background p-4 shadow-lg">
        <h3 className="font-semibold">Assess {trader.businessName}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatZAR(trader.avgMonthlyRevenue)}/month · {trader.consistencyScore}% consistency over 6
          months.
        </p>
        {error ? (
          <div className="mt-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Amount (R)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Term (months)</label>
            <Input type="number" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium">Decision</label>
            <Select value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="request_info">Request more info</option>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium">Note</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save assessment
          </Button>
        </div>
      </div>
    </div>
  );
}