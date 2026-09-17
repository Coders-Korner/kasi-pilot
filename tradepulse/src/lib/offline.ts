import Dexie, { type Table } from "dexie";

export interface QueuedTransaction {
  localId: string;
  type: "sale" | "purchase" | "adjustment";
  productName: string;
  quantity: number;
  unitPrice: number;
  timestamp: string;
  synced?: 0 | 1;
}

class TradePulseDB extends Dexie {
  queue!: Table<QueuedTransaction, string>;
  constructor() {
    super("tradepulse");
    this.version(1).stores({ queue: "localId, synced, timestamp" });
  }
}

let _db: TradePulseDB | null = null;
function db(): TradePulseDB {
  if (typeof window === "undefined") throw new Error("Dexie is client-only");
  if (!_db) _db = new TradePulseDB();
  return _db;
}

export async function enqueueTransaction(tx: QueuedTransaction): Promise<void> {
  await db().queue.put({ ...tx, synced: 0 });
}

export async function pendingCount(): Promise<number> {
  return db().queue.where("synced").equals(0).count();
}

export async function pendingItems(): Promise<QueuedTransaction[]> {
  return db().queue.where("synced").equals(0).toArray();
}

export async function flushQueue(): Promise<{ synced: number; errors: number }> {
  const items = await pendingItems();
  if (items.length === 0) return { synced: 0, errors: 0 };

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      transactions: items.map((i) => ({
        localId: i.localId,
        type: i.type,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        timestamp: i.timestamp,
      })),
    }),
  });

  if (!res.ok) throw new Error("Sync failed");
  const data = (await res.json()) as { results: { localId: string; status: string }[] };

  let synced = 0;
  let errors = 0;
  for (const r of data.results) {
    if (r.status === "error") {
      errors++;
    } else {
      await db().queue.delete(r.localId);
      synced++;
    }
  }
  return { synced, errors };
}