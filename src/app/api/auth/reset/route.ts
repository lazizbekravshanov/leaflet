import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { authService } from "@/services/auth.service";

// Rate-limited per IP so the reset token (large, but still) can't be brute-forced.
export const POST = apiHandler(async (request) => {
  const body = await readJson(request);
  await enforceRateLimit(`reset:ip:${clientIp(request)}`, 10, 3600);
  await authService.resetPassword(body.token, body.password);
  return NextResponse.json({ ok: true });
});
