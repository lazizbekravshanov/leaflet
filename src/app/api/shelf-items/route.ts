import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { shelfService } from "@/services/shelf.service";

// POST /api/shelf-items  { bookId, shelfType } — put a book on one of the
// caller's three system shelves (moving it off the other two).
export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = await readJson(request);
  const result = await shelfService.shelveBook(user.id, body.bookId, body.shelfType);
  return NextResponse.json(result, { status: 201 });
});
