import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { clearSessionCookie, getSessionToken } from "@/lib/auth";
import { authService } from "@/services/auth.service";

export const POST = apiHandler(async () => {
  const token = await getSessionToken();
  if (token) {
    // Delete the server-side session row FIRST — that's the real logout.
    // Clearing the cookie alone would leave a valid token in the database
    // (anyone who captured it could keep using it).
    await authService.logout(token);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
