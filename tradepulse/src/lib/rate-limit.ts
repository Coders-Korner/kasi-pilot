import type { NextRequest } from "next/server";

// Lightweight in-memory fixed-window rate limiter (single-instance demo/CI).
// Swap for Upstash Redis + middleware in production so limits survive restarts
// and horizontal scale-out (see Secure Development Cycle: rate limiting).

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();
const MAX_BUCKETS = 10_000;

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export interface RateLimitRule {
  label: string;
  limit: number;
  windowMs: number;
  key?: string;
  /** Per-key limit when `key` is set; defaults to `limit`. Sets eg. phone-level
   *  caps below the IP-wide cap without consuming the IP bucket twice. */
  keyLimit?: number;
}

export function exhausted(rule: RateLimitRule): { ok: true } | { ok: false; retryAfter: number } {
  if (buckets.size >= MAX_BUCKETS) {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const now = Date.now();
  let bucket = buckets.get(rule.label);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(rule.label, bucket);
  }
  bucket.count += 1;

  if (bucket.count > rule.limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

/** Returns a 429 Response when the caller exceeded a limit, otherwise null. */
export function enforceRateLimit(req: NextRequest, rule: RateLimitRule): Response | null {
  const ipKey = `${rule.label}:ip:${clientIp(req)}`;
  const hit = exhausted({ label: ipKey, limit: rule.limit, windowMs: rule.windowMs });
  if (!hit.ok) return rateLimited(hit.retryAfter);

  if (rule.key) {
    const keyLimit = rule.keyLimit ?? rule.limit;
    const keyed = exhausted({
      label: `${rule.label}:key:${rule.key}`,
      limit: keyLimit,
      windowMs: rule.windowMs,
    });
    if (!keyed.ok) return rateLimited(keyed.retryAfter);
  }
  return null;
}

function rateLimited(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(retryAfter) },
  });
}