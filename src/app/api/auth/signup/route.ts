import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { authService } from "@/services/auth.service";

export const POST = apiHandler(async (request) => {
  const body = await readJson(request);
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
