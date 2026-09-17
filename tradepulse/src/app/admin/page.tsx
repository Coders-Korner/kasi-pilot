"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Banknote, Store, Ticket, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/primitives";
import { apiGet } from "@/lib/client-api";
import { formatDate, formatZAR, timeAgo } from "@/lib/utils";

interface AdminOverview {
  stats: {
    totalUsers: number;
    traders: number;
    activeTraders: number;
    distributors: number;
    banks: number;
    admins: number;
    consentedBank: number;
    transactions30d: number;
    revenue30d: number;
    openTickets: number;
    newTraders7d: number;
  };
  series: { date: string; label: string; count: number; revenue: number }[];
  topTraders: { id: string; businessName: string; ownerName: string; location: string; revenue30d: number }[];
  recentTraders: {
    id: string;
    ownerName: string;
    businessName: string;
    phone: string;
    createdAt: string;
    status: string;
    isVerified: boolean;
  }[];
  tickets: { id: string; subject: string; status: string; priority: string; createdAt: string }[];
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => apiGet<AdminOverview>("/api/admin/overview"),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { stats, series, topTraders, recentTraders, tickets } = data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Platform overview</h1>
        <p className="text-sm text-muted-foreground">Live view of traders, activity and support.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Traders" value={stats.traders} hint={`${stats.newTraders7d} new this week`} icon={<Store className="h-4 w-4" />} />
        <Stat label="Active traders" value={stats.activeTraders} hint={`${stats.consentedBank} shared with banks`} icon={<Users className="h-4 w-4" />} tone="success" />
        <Stat label="Revenue (30d)" value={formatZAR(stats.revenue30d)} hint={`${stats.transactions30d} transactions`} icon={<Banknote className="h-4 w-4" />} />
        <Stat label="Open tickets" value={stats.openTickets} hint="Support queue" icon={<Ticket className="h-4 w-4" />} tone={stats.openTickets > 0 ? "warning" : "default"} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <Activity className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-base">Transaction volume (14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(180 12% 89%)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={1} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={40} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(173 80% 30%)" radius={[4, 4, 0, 0]} name="Records" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-base">Top traders (30d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topTraders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              topTraders.map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.businessName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.ownerName} · {t.location}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatZAR(t.revenue30d)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Newest traders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTraders.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.businessName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.phone} · joined {formatDate(t.createdAt)}
                  </p>
                </div>
                <Badge variant={t.status === "active" ? "success" : "destructive"}>{t.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <Ticket className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base">Recent support tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tickets.slice(0, 6).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t.subject}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.priority === "high" ? "destructive" : t.priority === "medium" ? "warning" : "secondary"}>
                  {t.priority}
                </Badge>
                <Badge variant={t.status === "resolved" ? "success" : t.status === "in_progress" ? "warning" : "secondary"}>
                  {t.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
          ))}
          {tickets.length === 0 ? <p className="text-sm text-muted-foreground">No tickets.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}