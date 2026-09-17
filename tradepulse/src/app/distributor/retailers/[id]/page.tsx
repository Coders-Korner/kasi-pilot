"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, MapPin, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, Stat } from "@/components/ui/primitives";
import { apiGet } from "@/lib/client-api";
import { formatZAR } from "@/lib/utils";

interface TraderDetail {
  trader: {
    id: string;
    ownerName: string;
    businessName: string;
    businessType: string;
    location: string;
    yearsInBusiness: number | null;
    consentDistributor: boolean;
    consentBank: boolean;
  };
  passport: {
    periodDays: number;
    totalRevenue: number;
    totalTransactions: number;
    avgMonthlyRevenue: number;
    consistencyScore: number;
    revenueTrend: "up" | "flat" | "down";
    activeDays: number;
    bestSelling: { productName: string; revenue: number; units: number }[];
    stockTurnover: { productName: string; turnover: number; note: string }[];
  };
}

export default function RetailerDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["retailer", params.id],
    queryFn: () => apiGet<TraderDetail>(`/api/partner/trader/${params.id}`),
    retry: false,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Could not load retailer."}
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const { trader, passport: p } = data;
  const TrendIcon = p.revenueTrend === "up" ? TrendingUp : p.revenueTrend === "down" ? TrendingDown : Minus;

  return (
    <div className="space-y-5">
      <Link
        href="/distributor/retailers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to retailers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{trader.businessName}</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {trader.ownerName} · <MapPin className="h-3.5 w-3.5" /> {trader.location}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={trader.consentDistributor ? "success" : "secondary"}>
            {trader.consentDistributor ? "shared with you" : "no distributor consent"}
          </Badge>
          <Badge variant={trader.consentBank ? "success" : "secondary"}>
            {trader.consentBank ? "bank-consented" : "no bank consent"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue (6mo)" value={formatZAR(p.totalRevenue)} hint={`${p.totalTransactions} records`} />
        <Stat label="Avg. monthly" value={formatZAR(p.avgMonthlyRevenue)} />
        <Stat label="Consistency" value={`${p.consistencyScore}%`} hint={`${p.activeDays} active days`} />
        <Stat
          label="Trend"
          value={
            <span className="flex items-center gap-1">
              <TrendIcon className="h-4 w-4" /> {p.revenueTrend}
            </span>
          }
          tone={p.revenueTrend === "up" ? "success" : p.revenueTrend === "down" ? "destructive" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trading consistency</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={p.consistencyScore} />
            <p className="mt-2 text-sm text-muted-foreground">
              {p.consistencyScore >= 60
                ? "Consistent trading — a reliable reorder partner."
                : "Trading is irregular; consider a promo or support visit."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top products (reorder candidates)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {p.bestSelling.map((s, i) => (
              <div key={s.productName} className="flex items-center justify-between text-sm">
                <span>
                  {i + 1}. {s.productName}
                </span>
                <span className="text-muted-foreground">
                  {s.units} units · {formatZAR(s.revenue)}
                </span>
              </div>
            ))}
            {p.bestSelling.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stock turnover</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {p.stockTurnover.map((s) => (
            <div key={s.productName} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span>{s.productName}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{s.turnover}x/mo</span>
                <Badge variant={s.note === "excellent" ? "success" : s.note === "good" ? "default" : "warning"}>
                  {s.note}
                </Badge>
              </span>
            </div>
          ))}
          {p.stockTurnover.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough data.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}