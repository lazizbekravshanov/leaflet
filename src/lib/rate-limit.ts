// Postgres-backed sliding-window rate limiter (Phase 5). HTTP concern — it
// reads the client IP off the request — so it lives in lib/ and is called from
// route handlers BEFORE the expensive work (bcrypt), never in the service layer.
//
// The window is a trailing interval, not a fixed calendar bucket: we count the
// attempts logged for a key in the last N seconds. A fixed window lets an
// attacker burst 2x the limit across the boundary (end of one window + start of
// the next); the sliding count closes that. This is the same shape Redis models
// with a sorted set — ZADD now, ZREMRANGEBYSCORE to prune, ZCOUNT the window —
// done here with one indexed table.
import { prisma } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";

// Reads the leftmost X-Forwarded-For hop (the original client) behind Vercel's
// proxy. Falls back to a constant so a missing header fails closed into one
// shared bucket rather than bypassing the limit entirely.
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

// Records the attempt and throws RateLimitError if the key is already over its
// limit for the window. The hit is logged on every call (including the
// rejected one) so a sustained flood keeps the window saturated.
export async function enforceRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const since = new Date(Date.now() - windowSeconds * 1000);
  const recent = await prisma.rateLimitHit.count({
    where: { bucket, createdAt: { gt: since } },
  });
  await prisma.rateLimitHit.create({ data: { bucket } });

  // Opportunistic prune: drop this bucket's rows older than the window so the
  // log stays bounded without a separate cron. Indexed by (bucket, created_at).
  await prisma.rateLimitHit.deleteMany({
    where: { bucket, createdAt: { lte: since } },
  });

  if (recent >= limit) throw new RateLimitError();
}
