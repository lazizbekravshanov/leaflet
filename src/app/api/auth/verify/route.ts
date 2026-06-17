import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { authService } from "@/services/auth.service";

// POST (not GET): consuming the single-use token is a side effect, so it must
// not ride on a link an email scanner or prefetch could fire. The /verify page
// posts here on a click.
export const POST = apiHandler(async (request) => {
  const body = await readJson(request);
  await authService.verifyEmail(body.token);
  return NextResponse.json({ ok: true });
});
