import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { authService } from "@/services/auth.service";

export const POST = apiHandler(async (request) => {
  const body = await readJson(request);
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
