"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDown, ArrowUp, Loader2, Package, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stat } from "@/components/ui/primitives";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/client-api";
import { cn, formatZAR, timeAgo } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStockThreshold: number;
  averagePrice: number;
  isLowStock: boolean;
  stockValue: number;
}

interface InventoryData {
  products: Product[];
  movements: {
    id: string;
    productName: string;
    change: number;
    reason: string;
    afterStock: number;
    timestamp: string;
  }[];
  summary: { totalProducts: number; lowStock: number; stockValue: number; totalUnits: number };
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => apiGet<InventoryData>("/api/inventory"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/products/${id}`),
    onSuccess: invalidate,
  });

  if (isLoading || !data) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground">Loading stock…</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-6">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Stock on hand</h1>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Product
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Products" value={data.summary.totalProducts} />
          <Stat
            label="Low stock"
            value={data.summary.lowStock}
            tone={data.summary.lowStock > 0 ? "warning" : "default"}
          />
          <Stat label="Stock value" value={formatZAR(data.summary.stockValue)} />
        </div>

        <div className="space-y-2">
          {data.products.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No products yet. Add one, or record a sale in the chat.
              </CardContent>
            </Card>
          ) : (
            data.products.map((p) => (
              <Card key={p.id} className={cn(p.isLowStock && "border-warning/50")}>
                <CardContent className="flex items-center gap-3 p-3.5">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      p.isLowStock ? "bg-warning/15 text-warning-foreground" : "bg-secondary text-primary"
                    )}
                  >
                    {p.isLowStock ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.category} · {formatZAR(p.averagePrice)} each
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{p.currentStock}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.isLowStock ? `min ${p.minStockThreshold}` : "in stock"}
                    </p>
                  </div>
                  <Button variant="ghost" size="iconSm" onClick={() => setEditing(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => {
                      if (confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Recent stock movements</h2>
          <Card>
            <CardContent className="p-3">
              {data.movements.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No movements yet.</p>
              ) : (
                data.movements.slice(0, 15).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between border-b py-2 text-sm last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full",
                          m.change >= 0 ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {m.change >= 0 ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div>
                        <p className="font-medium">{m.productName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.reason.replace(/_/g, " ")} · {timeAgo(m.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        {m.change > 0 ? "+" : ""}
                        {m.change}
                      </p>
                      <p className="text-[11px] text-muted-foreground">→ {m.afterStock}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {adding || editing ? (
        <ProductDialog
          product={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            invalidate();
            setAdding(false);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ProductDialog({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "General");
  const [stock, setStock] = useState(String(product?.currentStock ?? 0));
  const [min, setMin] = useState(String(product?.minStockThreshold ?? 5));
  const [price, setPrice] = useState(String(product?.averagePrice ?? 0));
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        category,
        currentStock: Number(stock),
        minStockThreshold: Number(min),
        averagePrice: Number(price),
      };
      return product
        ? apiPatch(`/api/products/${product.id}`, payload)
        : apiPost("/api/products", payload);
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border bg-background p-4 shadow-lg animate-slide-up">
        <h3 className="font-semibold">{product ? "Edit product" : "Add product"}</h3>
        {error ? (
          <div className="mt-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kota" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium">Category</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Stock on hand</label>
            <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Low-stock alert at</label>
            <Input type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium">Average selling price (R)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
          </Button>
        </div>
      </div>
    </div>
  );
}