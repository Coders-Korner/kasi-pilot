"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/client-api";

export function ExportButton({
  path,
  label = "Export CSV",
  className,
}: {
  path: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        className={className}
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          void downloadCsv(path)
            .catch((e) => setError(e instanceof Error ? e.message : "Export failed"))
            .finally(() => setBusy(false));
        }}
      >
        <Download className="h-4 w-4" /> {label}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}