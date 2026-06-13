import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { feedService, parseSort } from "@/services/feed.service";

// GET /api/feed?cursor=...&sort=new|top  — next page for the "Load more" button.
// sort defaults to "new" (chronological); "top" is the ranked feed.
export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  const params = new URL(request.url).searchParams;
  const cursor = params.get("cursor");
  const sort = parseSort(params.get("sort"));
  const page = await feedService.getPage(user.id, cursor, sort);
  return NextResponse.json(page);
});
