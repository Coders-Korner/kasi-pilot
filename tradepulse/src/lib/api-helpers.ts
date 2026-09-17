import { cookies } from "next/headers";
import { verifyToken, signSession, SESSION_COOKIE, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type ActorSession = SessionPayload & { id: string };

// Absolute session lifetime is 24h (JWT exp). On top of that, admins get an
// inactivity logout even while the JWT is still valid — see Threat modelling:
// "administrative sessions must expire after a period of inactivity".
export const ADMIN_INACTIVITY_MS = 30 * 60 * 1000;
const ACTIVE_TOUCH_MS = 60 * 1000;

export async function getActor(): Promise<ActorSession | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session) return null;

  // Re-validate against the DB on every protected API call: catches suspended
  // users and role changes, and enforces the admin inactivity window.
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, role: true, phone: true, status: true, lastActiveAt: true },
  });
  if (!user || user.status !== "active" || user.role !== session.role) return null;

  if (user.role === "admin") {
    if (
      user.lastActiveAt &&
      Date.now() - user.lastActiveAt.getTime() > ADMIN_INACTIVITY_MS
    ) {
      return null;
    }
  }

  const now = Date.now();
  if (!user.lastActiveAt || now - user.lastActiveAt.getTime() > ACTIVE_TOUCH_MS) {
    await prisma.user
      .update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
      .catch(() => {});
  }

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