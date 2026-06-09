import { NextResponse, type NextRequest } from "next/server";

// UX-level gate only. Middleware runs on the Edge runtime with no database
// access, so it can check that a session COOKIE exists but cannot verify the
// session is valid. The real authorization happens server-side on every
// request (requireUser / getCurrentUser hit the sessions table). A forged
// cookie gets past this redirect and then sees signed-out pages anyway —
// nothing is trusted from the cookie's presence alone.
const PROTECTED_PREFIXES = ["/shelves", "/people", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !request.cookies.has("leaflet_session")) {
    const login = new URL("/login", request.url);
    // Round-trip the destination so login can bounce back (Phase 1 nicety;
    // the login page currently ignores it).
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/shelves/:path*", "/people/:path*", "/settings/:path*"],
};
