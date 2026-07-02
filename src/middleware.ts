import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware for MeiCrypt Identity Frontend.
 *
 * Responsibilities:
 * - Attach a stable X-Request-Id for cross-service tracing.
 * - (Future) Resolve the tenant from the subdomain (e.g. acme.identity.meicrypt.com)
 *   and forward it as an X-Organization-Slug header to downstream API calls.
 *
 * Auth guards are handled client-side by the session store because the access
 * token lives in memory + sessionStorage. Server-only auth checks will be
 * added when we introduce server-side data fetching in Phase F2.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.headers.get("x-request-id")) {
    response.headers.set("x-request-id", crypto.randomUUID());
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes proxied by Next itself
     * - _next static/asset routes
     * - favicon and public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
