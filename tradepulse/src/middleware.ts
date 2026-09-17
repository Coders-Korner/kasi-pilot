import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest, PROTECTED_PREFIXES, ROLE_HOME } from "@/lib/session";

const ROLE_PREFIX: Record<string, string> = {
  trader: "/trader",
  distributor: "/distributor",
  bank: "/bank",
  admin: "/admin",
};

const isDev = process.env.NODE_ENV === "development";

// Edge runtime has no node:crypto/Buffer — use WebCrypto + btoa.
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string): string {
  const connectSrc = isDev ? "'self' ws: wss: http: https:" : "'self'";
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'unsafe-inline' 'nonce-${nonce}'`
    : `'self' 'nonce-${nonce}'`;
  const directives = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `connect-src ${connectSrc}`,
    `img-src 'self' data: blob:`,
    `media-src 'self' blob:`,
    `font-src 'self' data:`,
    `style-src 'self' 'unsafe-inline'`,
    `script-src ${scriptSrc}`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "0");
  if (!isDev) response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Per-request nonce so Next.js adds it to its inline scripts/styles (App Router).
  const nonce = makeNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  let response: NextResponse;

  if (!isProtected) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    const session = await getSessionFromRequest(req);

    if (!session) {
      if (pathname === "/login" || pathname === "/register" || pathname === "/" || pathname === "/verify") {
        response = NextResponse.next({ request: { headers: requestHeaders } });
      } else {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.search = `?next=${encodeURIComponent(pathname)}`;
        return applySecurityHeaders(NextResponse.redirect(url), buildCsp(nonce));
      }
    } else {
      const required = ROLE_PREFIX[session.role];
      if (required && !pathname.startsWith(required)) {
        const url = req.nextUrl.clone();
        url.pathname = ROLE_HOME[session.role] || "/login";
        return applySecurityHeaders(NextResponse.redirect(url), buildCsp(nonce));
      }
      response = NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  response.headers.set("x-nonce", nonce);
  return applySecurityHeaders(response, buildCsp(nonce));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|robots.txt).*)"],
};