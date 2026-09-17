"use client";

import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/primitives";
import { apiGet } from "@/lib/client-api";
import { formatZAR } from "@/lib/utils";

interface BankData {
  stats: {
    traders: number;
    totalRevenue6mo: number;
    avgMonthlyRevenue: number;
    highPotential: number;
    assessed: number;
    approved: number;
  };
  traders: {
    id: string;
    businessName: string;
    avgMonthlyRevenue: number;
  }[];
}

const COLORS = ["hsl(173 80% 30%)", "hsl(152 60% 38%)", "hsl(199 80% 45%)", "hsl(38 92% 50%)", "hsl(280 60% 55%)"];

export default function BankPortfolioPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["bank"],
    queryFn: () => apiGet<BankData>("/api/partner/bank"),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { stats, traders } = data;

  const pieData = traders
    .slice()
    .sort((a, b) => b.avgMonthlyRevenue - a.avgMonthlyRevenue)
    .slice(0, 5)
    .map((t) => ({ name: t.businessName, value: Math.round(t.avgMonthlyRevenue) }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">Aggregate view of consented trading businesses.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Consented traders" value={stats.traders} />
        <Stat label="Combined revenue (6mo)" value={formatZAR(stats.totalRevenue6mo)} tone="success" />
        <Stat label="Avg. monthly (per trader)" value={formatZAR(stats.avgMonthlyRevenue)} />
        <Stat label="High potential" value={stats.highPotential} hint="Consistent + established" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 5 by average monthly revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consented traders to show.</p>
          ) : (
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <div className="h-56 w-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatZAR(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {pieData.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3 text-sm">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="font-semibold tabular-nums">{formatZAR(p.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}