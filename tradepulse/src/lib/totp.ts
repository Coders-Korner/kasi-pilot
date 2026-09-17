import crypto from "crypto";

// RFC 6238 TOTP (SHA-1, 6 digits, 30s period) implemented without external
// dependencies so admin MFA needs no new packages. Base32 secrets are compatible
// with Google Authenticator / Authy / Microsoft Authenticator.

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(buf: Buffer): string {
  let output = "";
  let value = 0;
  let bits = 0;
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += B32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function generateSecret(bytes = 20): string {
  return encodeBase32(crypto.randomBytes(bytes));
}

export function decodeBase32(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): Buffer {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  return crypto.createHmac("sha1", secret).update(msg).digest();
}

export function totp(secret: string, stepSeconds = 30, digits = 6): string {
  const counter = Math.floor(Date.now() / 1000 / stepSeconds);
  const hmac = hotp(decodeBase32(secret), counter);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  const decoded = decodeBase32(secret);
  for (let i = -window; i <= window; i++) {
    const hmac = hotp(decoded, counter + i);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    if (String(binary % 1_000_000).padStart(6, "0") === clean) return true;
  }
  return false;
}

export function otpauthUri(secret: string, account: string, issuer = "TradePulse"): string {
  return `otpauth://totp/${encodeURIComponent(issuer + ":" + account)}?secret=${encodeURIComponent(
    secret
  )}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}