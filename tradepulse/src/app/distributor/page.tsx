"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ArrowRight, PackageCheck, Store, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/primitives";
import { apiGet } from "@/lib/client-api";
import { ExportButton } from "@/components/export-button";
import { formatZAR, timeAgo } from "@/lib/utils";

interface DistributorData {
  stats: {
    retailers: number;
    activeRetailers: number;
    revenue30d: number;
    orders30d: number;
    lowStockAlerts: number;
  };
  retailers: {
    id: string;
    businessName: string;
    ownerName: string;
    location: string;
    revenue30d: number;
    orders30d: number;
    stockValue: number;
    lowStockCount: number;
    productCount: number;
    lastActiveAt: string | null;
  }[];
  topProducts: { name: string; units: number; revenue: number }[];
  reorderAlerts: {
    productName: string;
    traderId: string;
    traderName: string;
    currentStock: number;
    minStockThreshold: number;
  }[];
  promotions: { id: string; title: string; product: string; discount: string; targetCount: number; sentAt: string }[];
}

export default function DistributorOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["distributor"],
    queryFn: () => apiGet<DistributorData>("/api/partner/distributor"),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { stats, retailers, topProducts, reorderAlerts, promotions } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Route to market</h1>
          <p className="text-sm text-muted-foreground">
            Retailers who shared their data with you. All figures are consent-gated and live.
          </p>
        </div>
        <ExportButton path="/api/partner/distributor/export" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Retailers" value={stats.retailers} hint={`${stats.activeRetailers} active this week`} icon={<Store className="h-4 w-4" />} />
        <Stat label="Their revenue (30d)" value={formatZAR(stats.revenue30d)} hint={`${stats.orders30d} orders`} icon={<TrendingUp className="h-4 w-4" />} tone="success" />
        <Stat label="Reorder alerts" value={stats.lowStockAlerts} hint="Items below threshold" icon={<AlertTriangle className="h-4 w-4" />} tone={stats.lowStockAlerts ? "warning" : "default"} />
        <Stat label="Promotions sent" value={promotions.length} hint="Last 30 days" icon={<PackageCheck className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Retailer performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {retailers.map((r) => (
              <Link
                key={r.id}
                href={`/distributor/retailers/${r.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.businessName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.location} · {r.lastActiveAt ? `active ${timeAgo(r.lastActiveAt)}` : "no activity"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {r.lowStockCount > 0 ? (
                    <Badge variant="warning">{r.lowStockCount} low</Badge>
                  ) : null}
                  <span className="text-sm font-semibold tabular-nums">{formatZAR(r.revenue30d)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
            {retailers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No retailers have consented yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reorder alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reorderAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock-outs across your network.</p>
            ) : (
              reorderAlerts.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.productName}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.traderName}</p>
                  </div>
                  <Badge variant="warning" className="shrink-0">
                    {a.currentStock} left (min {a.minStockThreshold})
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top products in your network</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.units} units</span>
                <span className="text-sm font-semibold tabular-nums">{formatZAR(p.revenue)}</span>
              </div>
            ))}
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent promotions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {promotions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No promotions sent yet.</p>
            ) : (
              promotions.map((p) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{p.title}</p>
                    <Badge>{p.discount}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.product} · sent to {p.targetCount} retailers · {timeAgo(p.sentAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}