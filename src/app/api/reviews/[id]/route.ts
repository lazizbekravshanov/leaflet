import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { engagementService } from "@/services/engagement.service";

export const DELETE = apiHandler(async (request) => {
  const user = await requireUser();
  const reviewId = new URL(request.url).pathname.split("/").pop() ?? "";
  await engagementService.deleteReview(user.id, reviewId);
  return NextResponse.json({ ok: true });
});
