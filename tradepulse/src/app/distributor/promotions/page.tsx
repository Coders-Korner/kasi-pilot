"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/client-api";
import { timeAgo } from "@/lib/utils";

interface Promotion {
  id: string;
  title: string;
  product: string;
  discount: string;
  message: string;
  targetCount: number;
  sentAt: string;
}

export default function DistributorPromotionsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [product, setProduct] = useState("");
  const [discount, setDiscount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data } = useQuery({
    queryKey: ["distributor"],
    queryFn: () => apiGet<{ retailers: { id: string; businessName: string }[]; promotions: Promotion[] }>(
      "/api/partner/distributor"
    ),
  });

  const mutation = useMutation({
    mutationFn: () => apiPost("/api/partner/distributor/promotion", { title, product, discount, message }),
    onSuccess: () => {
      setTitle("");
      setProduct("");
      setDiscount("");
      setMessage("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["distributor"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not send"),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Promotions</h1>
        <p className="text-sm text-muted-foreground">
          Send specials straight to the {data?.retailers.length ?? 0} retailers who shared their data
          with you.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">New promotion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? (
              <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
            ) : null}
            <Input placeholder="Title e.g. Winter Cool Drink Special" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Product" value={product} onChange={(e) => setProduct(e.target.value)} />
              <Input placeholder="Discount e.g. 15% off" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <Textarea
              placeholder="Message to retailers…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !title.trim() || !product.trim() || !message.trim()}
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send promotion
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sent promotions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.promotions.length ? (
              <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
            ) : (
              data.promotions.map((p) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{p.title}</p>
                    <Badge>{p.discount}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.product} · {p.targetCount} recipients · {timeAgo(p.sentAt)}
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