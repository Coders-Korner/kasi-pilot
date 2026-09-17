"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet, apiPatch } from "@/lib/client-api";
import { formatDate } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function AdminTicketsPage() {
  const queryClient = useQueryClient();

  const { data: overview, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => apiGet<{ tickets: Ticket[] }>("/api/admin/overview"),
  });

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiPatch(`/api/admin/tickets/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
  });

  const tickets = overview?.tickets ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-sm text-muted-foreground">Resolve trader issues and track priorities.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No support tickets.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-start">
                <div className="min-w-0 flex-1 sm:min-w-[220px]">
                  <p className="font-semibold">{t.subject}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Opened {formatDate(t.createdAt)}</p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="flex gap-2">
                    <Badge
                      variant={t.priority === "high" ? "destructive" : t.priority === "medium" ? "warning" : "secondary"}
                    >
                      {t.priority}
                    </Badge>
                    <Badge
                      variant={t.status === "resolved" ? "success" : t.status === "in_progress" ? "warning" : "secondary"}
                    >
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {t.status !== "in_progress" && t.status !== "resolved" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mutation.mutate({ id: t.id, payload: { status: "in_progress" } })}
                      >
                        Start
                      </Button>
                    ) : null}
                    {t.status !== "resolved" ? (
                      <Button
                        size="sm"
                        onClick={() => mutation.mutate({ id: t.id, payload: { status: "resolved" } })}
                      >
                        Resolve
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => mutation.mutate({ id: t.id, payload: { status: "open" } })}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}