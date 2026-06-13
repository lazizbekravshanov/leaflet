import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { authService } from "@/services/auth.service";

export const POST = apiHandler(async (request) => {
  const body = await readJson(request);
  // signup also runs bcrypt (a hash) — same DoS surface. Per-IP cap on account
  // creation, looser window than login.
  await enforceRateLimit(`signup:ip:${clientIp(request)}`, 8, 3600);
  const { user, session } = await authService.signup({
    email: body.email,
    username: body.username,
    password: body.password,
  });
  await setSessionCookie(session.token, session.expiresAt);
  // Echo back only public fields — never passwordHash.
  return NextResponse.json(
    { user: { id: user.id, username: user.username, email: user.email } },
    { status: 201 },
  );
});
