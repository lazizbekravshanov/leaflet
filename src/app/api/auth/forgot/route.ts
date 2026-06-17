import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { authService } from "@/services/auth.service";

// Always returns the same generic 200 — the service only sends mail if the
// account exists, so the response can't be used to enumerate registered emails.
export const POST = apiHandler(async (request) => {
  const body = await readJson(request);
  await enforceRateLimit(`forgot:ip:${clientIp(request)}`, 5, 3600);
  await authService.requestPasswordReset(body.email);
  return NextResponse.json({ ok: true });
});
