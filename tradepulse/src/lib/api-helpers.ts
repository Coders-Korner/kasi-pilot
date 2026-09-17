import { cookies } from "next/headers";
import { verifyToken, signSession, SESSION_COOKIE, type SessionPayload } from "@/lib/session";

export type ActorSession = SessionPayload & { id: string };

export async function getActor(): Promise<ActorSession | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session) return null;
  return { ...session, id: session.sub };
}

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function destroySessionCookie(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
}

export function requireRole(session: SessionPayload | null, roles: string[]) {
  if (!session) return { error: new Response("Unauthorized", { status: 401 }) };
  if (!roles.includes(session.role)) return { error: new Response("Forbidden", { status: 403 }) };
  return { error: null as null };
}

export function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function jsonOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}