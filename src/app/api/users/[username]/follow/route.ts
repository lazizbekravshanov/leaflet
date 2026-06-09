import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { followService } from "@/services/follow.service";

function usernameFrom(request: Request): string {
  const segments = new URL(request.url).pathname.split("/");
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  await followService.follow(user.id, usernameFrom(request));
  return NextResponse.json({ ok: true }, { status: 201 });
});

export const DELETE = apiHandler(async (request) => {
  const user = await requireUser();
  await followService.unfollow(user.id, usernameFrom(request));
  return NextResponse.json({ ok: true });
});
