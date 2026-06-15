import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { followRepository } from "@/repositories/follow.repository";
import { recommendationRepository } from "@/repositories/recommendation.repository";
import { createUser, createBook, createReadShelf } from "../helpers";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("recommendations (Phase 6)", () => {
  it("friends-of-friends: recommends a 2-hop candidate, weighted by mutuals", async () => {
    const [me, f1, f2, candidate] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ]);
    // I follow f1 and f2; both follow `candidate` → candidate is 2 hops away
    // with 2 mutuals.
    await followRepository.follow(me.id, f1.id);
    await followRepository.follow(me.id, f2.id);
    await followRepository.follow(f1.id, candidate.id);
    await followRepository.follow(f2.id, candidate.id);

    await recommendationRepository.refreshForUser(me.id);
    const recs = await recommendationRepository.listForUser(me.id, 10);

    const rec = recs.find((r) => r.id === candidate.id);
    expect(rec).toBeDefined();
    expect(rec!.mutuals).toBe(2);
    expect(rec!.reason).toBe("mutuals");

    // never myself, never someone I already follow
    expect(recs.some((r) => r.id === me.id)).toBe(false);
    expect(recs.some((r) => r.id === f1.id)).toBe(false);
    expect(recs.some((r) => r.id === f2.id)).toBe(false);
  });

  it("taste: recommends a non-followed user with overlapping READ shelves", async () => {
    const [me, twin] = await Promise.all([createUser(), createUser()]);
    const [b1, b2, b3] = await Promise.all([createBook(), createBook(), createBook()]);
    // Strong overlap: both have read the same three books, I follow no one.
    await createReadShelf(me.id, [b1.id, b2.id, b3.id]);
    await createReadShelf(twin.id, [b1.id, b2.id, b3.id]);

    await recommendationRepository.refreshForUser(me.id);
    const recs = await recommendationRepository.listForUser(me.id, 10);

    const rec = recs.find((r) => r.id === twin.id);
    expect(rec).toBeDefined();
    expect(rec!.reason).toBe("taste"); // no mutuals, pure shelf overlap
  });
});
