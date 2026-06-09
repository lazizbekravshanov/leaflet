import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { engagementService } from "@/services/engagement.service";

export const DELETE = apiHandler(async (request) => {
  const user = await requireUser();
  const commentId = new URL(request.url).pathname.split("/").pop() ?? "";
  await engagementService.deleteComment(user.id, commentId);
  return NextResponse.json({ ok: true });
});
