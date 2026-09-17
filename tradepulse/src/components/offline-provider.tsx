"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { flushQueue, pendingCount } from "@/lib/offline";

interface OfflineState {
  online: boolean;
  pending: number;
  flushing: boolean;
  lastSync: Date | null;
  syncNow: () => Promise<void>;
  refreshPending: () => Promise<void>;
}

const OfflineContext = createContext<OfflineState>({
  online: true,
  pending: 0,
  flushing: false,
  lastSync: null,
  syncNow: async () => {},
  refreshPending: async () => {},
});

export function useOffline() {
  return useContext(OfflineContext);
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshPending = async () => {
    try {
      setPending(await pendingCount());
    } catch {
      /* ignore */
    }
  };

  const syncNow = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setFlushing(true);
    try {
      await flushQueue();
      setLastSync(new Date());
    } catch {
      /* will retry */
    } finally {
      setFlushing(false);
      await refreshPending();
    }
  };

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshPending();

    const goOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    intervalRef.current = setInterval(() => {
      if (navigator.onLine) void syncNow();
    }, 20000);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <OfflineContext.Provider value={{ online, pending, flushing, lastSync, syncNow, refreshPending }}>
      {children}
    </OfflineContext.Provider>
  );
}