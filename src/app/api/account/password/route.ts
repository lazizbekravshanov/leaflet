import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { requireUser, getSessionToken } from "@/lib/auth";
import { authService } from "@/services/auth.service";

// Authenticated password change. The current session token is passed through so
// the service can keep THIS device signed in while revoking all others.
export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const token = await getSessionToken();
  const body = await readJson(request);
  await authService.changePassword(user.id, token ?? "", body.currentPassword, body.newPassword);
  return NextResponse.json({ ok: true });
});
