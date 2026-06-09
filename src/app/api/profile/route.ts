import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { userService } from "@/services/user.service";

// PATCH /api/profile  { displayName?, bio?, avatarUrl? } — the settings form.
export const PATCH = apiHandler(async (request) => {
  const user = await requireUser();
  const body = await readJson(request);
  await userService.updateProfile(user.id, {
    displayName: body.displayName,
    bio: body.bio,
    avatarUrl: body.avatarUrl,
  });
  return NextResponse.json({ ok: true });
});
