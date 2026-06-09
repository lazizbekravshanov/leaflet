// Shared plumbing for route handlers. Handlers stay thin controllers:
// parse input → call a service → shape the response. Everything cross-cutting
// (CSRF, error→status mapping) happens once, here.
import { NextResponse } from "next/server";
import { AppError, ValidationError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/csrf";

type Handler = (request: Request) => Promise<NextResponse>;

export function apiHandler(fn: Handler): Handler {
  return async (request) => {
    try {
      // Every mutating verb gets the CSRF origin check. GET/HEAD must be
      // safe (no side effects) anyway — SameSite=Lax doesn't protect them.
      if (request.method !== "GET" && request.method !== "HEAD") {
        assertSameOrigin(request);
      }
      return await fn(request);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status },
        );
      }
      // Unknown errors: log the details server-side, return none of them.
      // Stack traces and driver messages are reconnaissance material.
      console.error(error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body !== null && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // fall through to the error below
  }
  throw new ValidationError("Request body must be a JSON object");
}
