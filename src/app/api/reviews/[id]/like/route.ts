import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { engagementService } from "@/services/engagement.service";

// Like = a resource you PUT/DELETE, not an action you toggle. Separate verbs
// make both operations idempotent: liking twice or unliking twice is safe,
// which matters once optimistic UIs start retrying.
function reviewIdFrom(request: Request): string {
  // /api/reviews/[id]/like → second-to-last path segment
  const segments = new URL(request.url).pathname.split("/");
  return segments[segments.length - 2] ?? "";
}

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const result = await engagementService.like(user.id, reviewIdFrom(request));
  return NextResponse.json(result, { status: 201 });
});

export const DELETE = apiHandler(async (request) => {
  const user = await requireUser();
  const result = await engagementService.unlike(user.id, reviewIdFrom(request));
  return NextResponse.json(result);
});
