"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/client-api";
import { formatZAR, timeAgo } from "@/lib/utils";

interface Retailer {
  id: string;
  businessName: string;
  ownerName: string;
  businessType: string;
  location: string;
  revenue30d: number;
  orders30d: number;
  stockValue: number;
  lowStockCount: number;
  productCount: number;
  lastActiveAt: string | null;
}

export default function DistributorRetailersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["distributor"],
    queryFn: () => apiGet<{ retailers: Retailer[] }>("/api/partner/distributor"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Retailers</h1>
        <p className="text-sm text-muted-foreground">
          Consent-gated profiles for the retailers you supply.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.retailers.length ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No retailers have consented to data sharing yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.retailers.map((r) => (
            <Link key={r.id} href={`/distributor/retailers/${r.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{r.businessName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.ownerName} · {r.businessType}
                      </p>
                    </div>
                    {r.lowStockCount > 0 ? <Badge variant="warning">{r.lowStockCount} low</Badge> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue (30d)</p>
                      <p className="font-semibold">{formatZAR(r.revenue30d)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Stock value</p>
                      <p className="font-semibold">{formatZAR(r.stockValue)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{r.location}</span>
                    <span className="flex items-center gap-1">
                      {r.lastActiveAt ? timeAgo(r.lastActiveAt) : "inactive"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}