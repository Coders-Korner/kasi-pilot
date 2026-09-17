"use client";

import { useEffect, useState } from "react";
import { CloudOff, Cloud, RefreshCw } from "lucide-react";
import { useOffline } from "@/components/offline-provider";
import { cn } from "@/lib/utils";

export function ConnectionStatus({ compact = false }: { compact?: boolean }) {
  const { online, pending, flushing, syncNow } = useOffline();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const offline = !online;
  return (
    <button
      onClick={() => void syncNow()}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        offline
          ? "bg-warning/20 text-warning-foreground"
          : pending > 0
            ? "bg-primary/10 text-primary"
            : "bg-success/12 text-success",
        compact ? "" : "px-3"
      )}
      title={offline ? "Offline — sales will sync later" : "Online"}
    >
      {offline ? (
        <CloudOff className="h-3.5 w-3.5" />
      ) : flushing ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Cloud className="h-3.5 w-3.5" />
      )}
      {offline
        ? pending > 0
          ? `Offline • ${pending} to sync`
          : "Offline"
        : pending > 0
          ? `${pending} to sync`
          : "Synced"}
    </button>
  );
}