import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { feedService } from "@/services/feed.service";

// GET /api/feed?cursor=...  — next page for the "Load more" button.
export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  const cursor = new URL(request.url).searchParams.get("cursor");
  const page = await feedService.getPage(user.id, cursor);
  return NextResponse.json(page);
});
