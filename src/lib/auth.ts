// App-layer auth glue: this file owns the cookie. The auth service knows
// nothing about HTTP; route handlers and server components call these helpers.
import { cookies } from "next/headers";
import { AuthError } from "@/lib/errors";
import { authService } from "@/services/auth.service";

const SESSION_COOKIE = "leaflet_session";

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    // httpOnly: document.cookie cannot read it, so an XSS bug can abuse the
    // session only while the tab is open — it cannot exfiltrate the token.
    httpOnly: true,
    // secure: never sent over plain http. Default on; only explicit
    // development (localhost http) opts out. Gating on !== "development"
    // rather than === "production" means preview/staging/self-host builds
    // stay secure instead of silently shipping the cookie in the clear.
    secure: process.env.NODE_ENV !== "development",
    // lax: the CSRF layer 1 (see lib/csrf.ts for layer 2). Cross-site
    // POSTs don't carry the cookie; top-level link navigation still does,
    // so following a leaflet link from elsewhere keeps you signed in.
    // ("strict" would log you out of every externally-clicked link for a
    // marginal gain — that's why almost nobody uses it for sessions.)
    sameSite: "lax",
    path: "/",
    // The cookie's expiry is a UX hint to the browser; the AUTHORITATIVE
    // expiry is sessions.expires_at in the database. Never trust the client
    // to enforce a deadline.
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

// For server components: null when signed out, never throws.
export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;
  return authService.getUserForToken(token);
}

// For mutating API routes: 401 via the central error mapper when signed out.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}
