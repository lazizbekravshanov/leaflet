import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { feedService } from "@/services/feed.service";
import { followRepository } from "@/repositories/follow.repository";
import { createUser, createBook, createReview } from "../helpers";

afterAll(async () => {
  await prisma.$disconnect();
});

// Build an isolated feed: a fresh viewer following a fresh author with 12
// reviews, so the feed contains exactly those 12 items.
async function buildFeed(reviewCount: number) {
  const [viewer, author] = await Promise.all([createUser(), createUser()]);
  await followRepository.follow(viewer.id, author.id);
  for (let i = 0; i < reviewCount; i++) {
    const book = await createBook();
    await createReview(author.id, book.id);
  }
  return viewer;
}

describe("feed pagination (Phases 3 + 5)", () => {
  it("chronological: keyset pages with no overlap", async () => {
    const viewer = await buildFeed(12);

    const p1 = await feedService.getPage(viewer.id, null, "new");
    expect(p1.items).toHaveLength(10); // PAGE_SIZE
    expect(p1.nextCursor).toBeTruthy();

    const p2 = await feedService.getPage(viewer.id, p1.nextCursor, "new");
    expect(p2.items).toHaveLength(2);
    expect(p2.nextCursor).toBeNull();

    const firstIds = new Set(p1.items.map((i) => i.itemId));
    expect(p2.items.every((i) => !firstIds.has(i.itemId))).toBe(true);
  });

  it("ranked mode returns a page and a (mode-tagged) cursor", async () => {
    const viewer = await buildFeed(12);
    const top = await feedService.getPage(viewer.id, null, "top");
    expect(top.items).toHaveLength(10);
    expect(top.nextCursor).toBeTruthy();
  });

  it("rejects a cursor replayed against the wrong sort mode", async () => {
    const viewer = await buildFeed(12);
    const top = await feedService.getPage(viewer.id, null, "top");
    // a "top" cursor handed to the chronological reader must be rejected
    await expect(feedService.getPage(viewer.id, top.nextCursor, "new")).rejects.toThrow();
  });
});
