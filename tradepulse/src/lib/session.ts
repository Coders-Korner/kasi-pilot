import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const SESSION_COOKIE = "tp_session";

export interface SessionPayload {
  sub: string;
  phone: string;
  role: string;
}

export function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be configured in production");
    }
    return new TextEncoder().encode("dev-secret-change-me");
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production");
  }
  return new TextEncoder().encode(secret);
}

export type AuthChallengeKind = "pin" | "mfa";

export async function signAuthChallenge(
  kind: AuthChallengeKind,
  payload: { sub: string; phone: string }
): Promise<string> {
  return new SignJWT({ kind, phone: payload.phone })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(getSessionSecret());
}

export async function verifyAuthChallenge(
  token: string,
  kind: AuthChallengeKind,
  phone: string
): Promise<{ sub: string; phone: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (payload.kind !== kind || payload.phone !== phone || !payload.sub) return null;
    return { sub: payload.sub, phone };
  } catch {
    return null;
  }
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ phone: payload.phone, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSessionSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      phone: (payload.phone as string) || "",
      role: (payload.role as string) || "trader",
    };
  } catch {
    return null;
  }
}

// Server-side (App Router): read session from cookies()
export async function getSession(): Promise<SessionPayload | null> {
  const store = cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Edge-safe (middleware): read session from a request
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(payload: SessionPayload): Promise<string> {
  const token = await signSession(payload);
  return token;
}

export const ROLE_HOME: Record<string, string> = {
  trader: "/trader/chat",
  distributor: "/distributor",
  bank: "/bank",
  admin: "/admin",
};

export const PROTECTED_PREFIXES = ["/trader", "/admin", "/distributor", "/bank"];