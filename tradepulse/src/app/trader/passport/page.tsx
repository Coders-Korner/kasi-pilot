"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Download,
  FileBadge,
  LineChart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/primitives";
import { apiGet } from "@/lib/client-api";
import { formatZAR } from "@/lib/utils";

interface Passport {
  businessName: string;
  ownerName: string;
  location: string;
  businessType: string;
  periodDays: number;
  totalRevenue: number;
  totalTransactions: number;
  avgMonthlyRevenue: number;
  consistencyScore: number;
  activeDays: number;
  revenueTrend: "up" | "flat" | "down";
  bestSelling: { productName: string; revenue: number; units: number }[];
  stockTurnover: { productName: string; turnover: number; note: string }[];
  generatedAt: string;
}

function readinessScore(p: Passport): number {
  return Math.round(
    p.consistencyScore * 0.5 +
      Math.min(100, (p.avgMonthlyRevenue / 10000) * 100) * 0.3 +
      Math.min(100, (p.activeDays / 100) * 100) * 0.2
  );
}

export default function PassportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["passport"],
    queryFn: () => apiGet<{ passport: Passport }>("/api/passport"),
  });

  if (isLoading || !data) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground">Building your passport…</p>
      </div>
    );
  }

  const p = data.passport;
  const score = readinessScore(p);
  const TrendIcon = p.revenueTrend === "up" ? TrendingUp : p.revenueTrend === "down" ? TrendingDown : Minus;

  return (
    <div className="h-full overflow-y-auto p-4 pb-6">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Readiness Passport</h1>
          <a href="/api/passport/pdf" target="_blank" rel="noreferrer">
            <Button size="sm">
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
          </a>
        </div>

        <Card className="overflow-hidden border-primary/30">
          <div className="bg-primary p-5 text-primary-foreground">
            <div className="flex items-center gap-2 text-sm opacity-90">
              <FileBadge className="h-4 w-4" /> Verified by TradePulse
            </div>
            <p className="mt-1 text-xl font-bold">{p.businessName}</p>
            <p className="text-sm opacity-90">
              {p.ownerName} · {p.businessType} · {p.location}
            </p>
          </div>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(170 15% 92%)" strokeWidth="12" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="hsl(173 80% 30%)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 264} 264`}
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="text-2xl font-extrabold">{score}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">of 100</p>
                </div>
              </div>
              <div className="flex-1">
                <Badge variant={score >= 70 ? "success" : score >= 50 ? "warning" : "secondary"}>
                  {score >= 70 ? "Strong profile" : score >= 50 ? "Growing profile" : "Building history"}
                </Badge>
                <p className="mt-2 text-sm text-muted-foreground">
                  Based on {p.totalTransactions} verified records over the last {p.periodDays} days.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="6-month revenue" value={formatZAR(p.totalRevenue)} />
              <Metric label="Avg. monthly" value={formatZAR(p.avgMonthlyRevenue)} />
              <Metric label="Active trading days" value={String(p.activeDays)} />
              <Metric
                label="Trend"
                value={
                  <span className="flex items-center gap-1">
                    <TrendIcon className="h-3.5 w-3.5" />
                    {p.revenueTrend === "up" ? "Growing" : p.revenueTrend === "down" ? "Declining" : "Stable"}
                  </span>
                }
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">Trading consistency (30 days)</span>
                <span className="font-semibold">{p.consistencyScore}%</span>
              </div>
              <Progress value={p.consistencyScore} />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Days you recorded at least one sale. Lenders look for 60%+.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <Award className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Top sellers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.bestSelling.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              p.bestSelling.map((s, i) => (
                <div key={s.productName} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm">{s.productName}</span>
                  <span className="text-xs text-muted-foreground">{s.units} units</span>
                  <span className="text-sm font-semibold tabular-nums">{formatZAR(s.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <LineChart className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Stock turnover</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.stockTurnover.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough stock data.</p>
            ) : (
              p.stockTurnover.map((s) => (
                <div key={s.productName} className="flex items-center justify-between text-sm">
                  <span className="truncate">{s.productName}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{s.turnover}x / month</span>
                    <Badge
                      variant={
                        s.note === "excellent"
                          ? "success"
                          : s.note === "good"
                            ? "default"
                            : s.note === "fair"
                              ? "warning"
                              : "secondary"
                      }
                    >
                      {s.note}
                    </Badge>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-accent/40">
          <CardContent className="flex gap-3 p-4 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              Your passport is generated from records you captured. Share it only when you choose —
              control who sees it in Settings → Data sharing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}