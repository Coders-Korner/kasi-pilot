// In-memory OTP store (single-instance dev/demo). Swap for Redis/Twilio in production.
// Enterprise SMS is out of scope — when OTP_DEV_MODE=1 the code is returned to the UI.
// Account lockout: too many wrong codes (across the window) temporarily blocks
// verification for the phone — see Secure Development Cycle: OTP lockout.

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const store = new Map<string, OtpEntry>();
const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

/** Phone → { failures, until } for lockout accounting. Survives OTP rotation. */
const failuresByPhone = new Map<string, { count: number; until: number }>();

function now() {
  return Date.now();
}

export function createOtp(phone: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.set(phone, { code, expiresAt: now() + TTL_MS, attempts: 0 });
  return code;
}

/** True when the phone is under a lockout cooldown. */
export function isOtpLocked(phone: string): boolean {
  const f = failuresByPhone.get(phone);
  if (!f) return false;
  if (f.until <= now()) {
    failuresByPhone.delete(phone);
    return false;
  }
  return f.count >= MAX_ATTEMPTS;
}

/** Registers a failed verification; returns true once the phone becomes locked. */
export function recordOtpFailure(phone: string): boolean {
  const rolled = now() + FAIL_WINDOW_MS;
  const f = failuresByPhone.get(phone);
  if (!f || f.until <= now()) {
    failuresByPhone.set(phone, { count: 1, until: rolled });
  } else {
    f.count += 1;
  }
  const cur = failuresByPhone.get(phone)!;
  if (cur.count >= MAX_ATTEMPTS) cur.until = now() + LOCK_MS;
  return cur.count >= MAX_ATTEMPTS;
}

export function clearOtpFailures(phone: string): void {
  failuresByPhone.delete(phone);
}

export function verifyOtp(phone: string, code: string): boolean {
  if (isOtpLocked(phone)) return false;
  const entry = store.get(phone);
  if (!entry) return false;
  if (now() > entry.expiresAt) {
    store.delete(phone);
    return false;
  }
  if (entry.code !== code.replace(/\s+/g, "")) {
    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      store.delete(phone);
      recordOtpFailure(phone);
    }
    return false;
  }
  store.delete(phone);
  clearOtpFailures(phone);
  return true;
}

export function getDevOtp(phone: string): string | null {
  if (process.env.OTP_DEV_MODE !== "1") return null;
  const entry = store.get(phone);
  return entry ? entry.code : null;
}

export { MAX_ATTEMPTS, LOCK_MS };