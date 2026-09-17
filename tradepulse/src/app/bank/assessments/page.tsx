"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/client-api";
import { formatDate, formatZAR } from "@/lib/utils";

interface Assessment {
  id: string;
  amount: number;
  termMonths: number;
  readinessScore: number;
  decision: string;
  note: string | null;
  createdAt: string;
  trader: { businessName: string | null; ownerName: string };
}

export default function BankAssessmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["bank-assessments"],
    queryFn: () => apiGet<{ assessments: Assessment[] }>("/api/partner/bank/assess"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Assessments</h1>
        <p className="text-sm text-muted-foreground">Your decisions and readiness scores.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.assessments.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <ClipboardCheck className="h-8 w-8" />
            No assessments yet. Start from the pipeline.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.assessments.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">
                  {a.trader?.businessName || a.trader?.ownerName}
                </CardTitle>
                <Badge
                  variant={
                    a.decision === "approved"
                      ? "success"
                      : a.decision === "declined"
                        ? "destructive"
                        : "warning"
                  }
                >
                  {a.decision.replace("_", " ")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>
                  Requested {formatZAR(a.amount)} over {a.termMonths} months · readiness score{" "}
                  <span className="font-semibold text-foreground">{a.readinessScore}/100</span>
                </p>
                {a.note ? <p className="italic">“{a.note}”</p> : null}
                <p className="text-xs">Assessed {formatDate(a.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}