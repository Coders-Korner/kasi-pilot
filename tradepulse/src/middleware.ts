import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest, PROTECTED_PREFIXES, ROLE_HOME } from "@/lib/session";

const ROLE_PREFIX: Record<string, string> = {
  trader: "/trader",
  distributor: "/distributor",
  bank: "/bank",
  admin: "/admin",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const session = await getSessionFromRequest(req);

  // Landing / auth pages keep unauthenticated visitors.
  if (!session) {
    if (pathname === "/login" || pathname === "/register" || pathname === "/" || pathname === "/verify") {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Role guard
  const required = ROLE_PREFIX[session.role];
  if (required && !pathname.startsWith(required)) {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[session.role] || "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/trader/:path*", "/admin/:path*", "/distributor/:path*", "/bank/:path*"],
};