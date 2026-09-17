"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Lightbulb,
  PackageX,
  Plus,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/primitives";
import { apiGet } from "@/lib/client-api";
import { cn, formatZAR, timeAgo } from "@/lib/utils";
import { useState } from "react";
import { ManualEntryDialog } from "@/components/manual-entry-dialog";

interface DashboardData {
  today: { revenue: number; expense: number; transactions: number; sales: number };
  series: { date: string; label: string; revenue: number; expense: number; profit: number }[];
  topProducts: { name: string; revenue: number; units: number }[];
  lowStock: { id: string; name: string; currentStock: number; minStockThreshold: number }[];
  recent: {
    id: string;
    type: string;
    productName: string;
    quantity: number;
    total: number;
    timestamp: string;
    status: string;
  }[];
  stats: {
    revenueMonth: number;
    expensesMonth: number;
    profitMonth: number;
    salesCount: number;
    wowChange: number | null;
    pendingCount: number;
    stockValue: number;
    productCount: number;
  };
  insight: string;
}

export default function DashboardPage() {
  const [manualOpen, setManualOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardData>("/api/dashboard"),
  });

  if (isLoading || !data) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    );
  }

  const { today, stats, series, topProducts, lowStock, recent, insight } = data;

  return (
    <div className="h-full overflow-y-auto p-4 pb-6">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Today</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-ZA", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <button
            onClick={() => setManualOpen(true)}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Sales today"
            value={formatZAR(today.revenue)}
            hint={`${today.sales} sale${today.sales === 1 ? "" : "s"}`}
            icon={<Banknote className="h-4 w-4" />}
            tone="success"
          />
          <Stat
            label="Bought today"
            value={formatZAR(today.expense)}
            hint={`${today.transactions} record${today.transactions === 1 ? "" : "s"}`}
            icon={<ShoppingBag className="h-4 w-4" />}
          />
        </div>

        <Card className="border-primary/20 bg-accent/60">
          <CardContent className="flex gap-3 p-4">
            <Lightbulb className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Weekly insight</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{insight}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Last 7 days</CardTitle>
            <Badge variant="secondary">Revenue</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(173 80% 30%)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(173 80% 30%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(180 12% 89%)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
                  <Tooltip
                    formatter={(v) => [formatZAR(Number(v)), "Revenue"]}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(173 80% 30%)"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="30-day revenue"
            value={formatZAR(stats.revenueMonth)}
            hint={
              stats.wowChange === null
                ? `${stats.salesCount} sales`
                : `${stats.wowChange >= 0 ? "+" : ""}${stats.wowChange}% vs last week`
            }
            tone={stats.wowChange !== null && stats.wowChange < 0 ? "destructive" : "success"}
          />
          <Stat
            label="30-day profit"
            value={formatZAR(stats.profitMonth)}
            hint={`Costs ${formatZAR(stats.expensesMonth)}`}
          />
        </div>

        {lowStock.length > 0 ? (
          <Card className="border-warning/40">
            <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
              <PackageX className="h-4 w-4 text-warning-foreground" />
              <CardTitle className="text-base">Low stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <Badge variant="warning">
                    {p.currentStock} left (min {p.minStockThreshold})
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Best sellers (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.units} units</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatZAR(p.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b py-2 last:border-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full",
                      t.type === "sale" ? "bg-success/12 text-success" : "bg-warning/15"
                    )}
                  >
                    {t.type === "sale" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {t.quantity} × {t.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(t.timestamp)} · {t.status}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatZAR(t.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="px-1 text-center text-[11px] text-muted-foreground">
          Stock on hand value: {formatZAR(stats.stockValue)} across {stats.productCount} products
        </p>
      </div>

      <ManualEntryDialog open={manualOpen} onClose={() => setManualOpen(false)} />
    </div>
  );
}