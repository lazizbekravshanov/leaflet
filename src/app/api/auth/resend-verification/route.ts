import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { authService } from "@/services/auth.service";

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  await enforceRateLimit(`resend:ip:${clientIp(request)}`, 3, 3600);
  await authService.resendVerification(user.id);
  return NextResponse.json({ ok: true });
});
