import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { authService } from "@/services/auth.service";

export const POST = apiHandler(async (request) => {
  const body = await readJson(request);
  // Rate-limit BEFORE login() runs its ~250ms bcrypt compare — otherwise the
  // slowness that protects the password hash becomes a CPU-exhaustion DoS.
  // Two buckets: per-IP (flood control) and per-email (targeted brute force).
  await enforceRateLimit(`login:ip:${clientIp(request)}`, 10, 600);
  if (typeof body.email === "string" && body.email.length <= 254) {
    await enforceRateLimit(`login:email:${body.email.toLowerCase()}`, 5, 600);
  }
  const { user, session } = await authService.login({
    email: body.email,
    password: body.password,
  });
  // login() minted a fresh session (rotation) — overwrite whatever cookie
  // the browser had.
  await setSessionCookie(session.token, session.expiresAt);
  return NextResponse.json({
    user: { id: user.id, username: user.username, email: user.email },
  });
});
