import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";
import { uid } from "../helpers";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("clientIp", () => {
  it("takes the leftmost X-Forwarded-For hop", () => {
    const r = new Request("https://x/", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(r)).toBe("1.2.3.4");
  });
  it("falls back to a constant when no header is present", () => {
    expect(clientIp(new Request("https://x/"))).toBe("unknown");
  });
});

describe("enforceRateLimit (Phase 5)", () => {
  it("allows up to the limit, then rejects", async () => {
    const bucket = uid("rl"); // unique bucket → isolated from other tests
    // limit 3: three calls pass (recent counts 0,1,2), the fourth (recent 3) trips.
    await enforceRateLimit(bucket, 3, 60);
    await enforceRateLimit(bucket, 3, 60);
    await enforceRateLimit(bucket, 3, 60);
    await expect(enforceRateLimit(bucket, 3, 60)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("separate buckets don't interfere", async () => {
    const a = uid("rl");
    const b = uid("rl");
    await enforceRateLimit(a, 1, 60); // a now at limit
    await expect(enforceRateLimit(a, 1, 60)).rejects.toBeInstanceOf(RateLimitError);
    await expect(enforceRateLimit(b, 1, 60)).resolves.toBeUndefined(); // b is fresh
  });
});
