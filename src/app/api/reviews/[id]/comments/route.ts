import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { engagementService } from "@/services/engagement.service";

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = await readJson(request);
  const segments = new URL(request.url).pathname.split("/");
  const reviewId = segments[segments.length - 2] ?? "";
  const comment = await engagementService.addComment(user.id, reviewId, body.body);
  return NextResponse.json({ comment }, { status: 201 });
});
