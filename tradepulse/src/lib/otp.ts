// In-memory OTP store (single-instance dev/demo). Swap for Redis/Twilio in production.
// Enterprise SMS is out of scope — when OTP_DEV_MODE=1 the code is returned to the UI.

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const store = new Map<string, OtpEntry>();
const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function createOtp(phone: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.set(phone, { code, expiresAt: Date.now() + TTL_MS, attempts: 0 });
  return code;
}

export function verifyOtp(phone: string, code: string): boolean {
  const entry = store.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return false;
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(phone);
    return false;
  }
  if (entry.code !== code.replace(/\s+/g, "")) {
    entry.attempts += 1;
    return false;
  }
  store.delete(phone);
  return true;
}

export function getDevOtp(phone: string): string | null {
  if (process.env.OTP_DEV_MODE !== "1") return null;
  const entry = store.get(phone);
  return entry ? entry.code : null;
}