"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { apiPost } from "@/lib/client-api";

export function ManualEntryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState("sale");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiPost("/api/transactions", {
        type,
        productName: productName.trim(),
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      setProductName("");
      setQuantity("1");
      setUnitPrice("0");
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save"),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border bg-background p-4 shadow-lg animate-slide-up">
        <h3 className="font-semibold">Add a record manually</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Prefer chatting? You can always just type it in the chat.
        </p>
        {error ? (
          <div className="mt-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium">Product</label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Kota"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="sale">Sale</option>
              <option value="purchase">Purchase</option>
              <option value="adjustment">Stock adjustment</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Quantity</label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium">Unit price (R)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !productName.trim() || Number(quantity) < 1}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save record
          </Button>
        </div>
      </div>
    </div>
  );
}