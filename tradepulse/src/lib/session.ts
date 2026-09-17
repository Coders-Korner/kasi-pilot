import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const SESSION_COOKIE = "tp_session";

export interface SessionPayload {
  sub: string;
  phone: string;
  role: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ phone: payload.phone, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
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