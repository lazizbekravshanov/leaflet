import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { likeRepository } from "@/repositories/like.repository";
import { followRepository } from "@/repositories/follow.repository";
import { commentRepository } from "@/repositories/comment.repository";
import { reviewRepository } from "@/repositories/review.repository";
import { createUser, createBook, createReview } from "../helpers";

afterAll(async () => {
  await prisma.$disconnect();
});

// These are the invariants verified by hand across Phases 2 and 5 — now pinned.

describe("like_count maintenance (Phase 2)", () => {
  it("increments once and is idempotent under a double-like", async () => {
    const [author, book, liker] = await Promise.all([createUser(), createBook(), createUser()]);
    const review = await createReview(author.id, book.id);

    expect(await likeRepository.like(liker.id, review.id)).toBe(1);
    // Double-click / retry: ON CONFLICT DO NOTHING, counter must NOT inflate.
    expect(await likeRepository.like(liker.id, review.id)).toBe(1);

    const row = await prisma.review.findUniqueOrThrow({ where: { id: review.id } });
    const truth = await prisma.like.count({ where: { reviewId: review.id } });
    expect(row.likeCount).toBe(1);
    expect(truth).toBe(1);

    expect(await likeRepository.unlike(liker.id, review.id)).toBe(0);
    expect(await likeRepository.unlike(liker.id, review.id)).toBe(0); // idempotent
  });
});

describe("follow counters (Phase 2)", () => {
  it("one edge bumps both users; idempotent; reversible", async () => {
    const [a, b] = await Promise.all([createUser(), createUser()]);

    await followRepository.follow(a.id, b.id);
    await followRepository.follow(a.id, b.id); // idempotent

    let A = await prisma.user.findUniqueOrThrow({ where: { id: a.id } });
    let B = await prisma.user.findUniqueOrThrow({ where: { id: b.id } });
    expect(A.followingCount).toBe(1);
    expect(B.followerCount).toBe(1);

    await followRepository.unfollow(a.id, b.id);
    A = await prisma.user.findUniqueOrThrow({ where: { id: a.id } });
    B = await prisma.user.findUniqueOrThrow({ where: { id: b.id } });
    expect(A.followingCount).toBe(0);
    expect(B.followerCount).toBe(0);
  });
});

describe("comment_count maintenance (Phase 5)", () => {
  it("increments on create and decrements on delete", async () => {
    const [author, book, commenter] = await Promise.all([createUser(), createBook(), createUser()]);
    const review = await createReview(author.id, book.id);

    await commentRepository.create({ userId: commenter.id, reviewId: review.id, body: "Nice." });
    expect((await prisma.review.findUniqueOrThrow({ where: { id: review.id } })).commentCount).toBe(1);

    const comment = await prisma.comment.findFirstOrThrow({ where: { reviewId: review.id } });
    await commentRepository.delete(comment.id);
    expect((await prisma.review.findUniqueOrThrow({ where: { id: review.id } })).commentCount).toBe(0);
  });
});

describe("rating-aggregate cache (Phase 5)", () => {
  it("recomputes avg/count on new ratings and on an edit", async () => {
    const [u1, u2, book] = await Promise.all([createUser(), createUser(), createBook()]);

    await reviewRepository.upsertReviewWithRating(u1.id, book.id, "Five from me.", 5);
    let b = await prisma.book.findUniqueOrThrow({ where: { id: book.id } });
    expect(b.ratingCount).toBe(1);
    expect(b.avgRating).toBe(5);

    await reviewRepository.upsertReviewWithRating(u2.id, book.id, "One from me.", 1);
    b = await prisma.book.findUniqueOrThrow({ where: { id: book.id } });
    expect(b.ratingCount).toBe(2);
    expect(b.avgRating).toBe(3); // (5 + 1) / 2

    // Editing u1's rating (upsert update, not insert) changes avg, not count.
    await reviewRepository.upsertReviewWithRating(u1.id, book.id, "Lowering it.", 1);
    b = await prisma.book.findUniqueOrThrow({ where: { id: book.id } });
    expect(b.ratingCount).toBe(2);
    expect(b.avgRating).toBe(1); // (1 + 1) / 2

    // And the author's review_count was maintained too.
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u1.id } })).reviewCount).toBe(1);
  });

  it("clears the aggregate when the last rating's review is deleted", async () => {
    const [u, book] = await Promise.all([createUser(), createBook()]);
    await reviewRepository.upsertReviewWithRating(u.id, book.id, "Solid.", 4);
    const review = await prisma.review.findFirstOrThrow({ where: { bookId: book.id, userId: u.id } });

    await reviewRepository.delete(review.id, u.id, book.id);
    const b = await prisma.book.findUniqueOrThrow({ where: { id: book.id } });
    expect(b.ratingCount).toBe(0);
    expect(b.avgRating).toBeNull();
  });
});
