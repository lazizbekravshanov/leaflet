import { ValidationError } from "@/lib/errors";

// CSRF defense, layer 2 of 2.
//
// Layer 1 is the cookie itself: SameSite=Lax means browsers do not attach our
// session cookie to cross-site POST/PUT/DELETE requests at all, so a form on
// evil.com posting to our API arrives unauthenticated.
//
// This Origin check is defense in depth for the gaps Lax leaves: very old
// browsers without SameSite support, and subtle cases like subdomain takeover.
// Browsers always set the Origin header on cross-origin requests and on all
// POSTs, and a page CANNOT spoof it from JS — that's what makes it trustworthy.
//
// We compare against the Host header instead of a configured allowlist so the
// check works unchanged on localhost, preview deploys, and production.
// (X-Forwarded-Host is what Vercel's proxy sets; Host works locally.)
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // same-origin non-CORS requests may omit it

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) throw new ValidationError("Missing Host header");

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ValidationError("Malformed Origin header");
  }

  if (originHost !== host) {
    throw new ValidationError("Cross-origin request rejected");
  }
}
