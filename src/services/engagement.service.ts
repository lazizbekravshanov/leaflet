// Likes and comments on reviews. Ownership rules live here — repositories
// never decide WHO may do something, only HOW it's stored.
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { requireString } from "@/lib/validate";
import { likeRepository } from "@/repositories/like.repository";
import { commentRepository } from "@/repositories/comment.repository";
import { reviewRepository } from "@/repositories/review.repository";

async function getReviewOr404(reviewId: string) {
  const review = await reviewRepository.findById(reviewId);
  if (!review) throw new NotFoundError("Review not found");
  return review;
}

export const engagementService = {
  async like(userId: string, reviewId: string) {
    await getReviewOr404(reviewId);
    // The atomic like statement returns the maintained counter — no separate
    // COUNT(*) round-trip after the write.
    const count = await likeRepository.like(userId, reviewId);
    return { count };
  },

  async unlike(userId: string, reviewId: string) {
    const count = await likeRepository.unlike(userId, reviewId);
    return { count };
  },

  async addComment(userId: string, reviewId: string, rawBody: unknown) {
    const body = requireString(rawBody, "body", { min: 1, max: 2_000 });
    await getReviewOr404(reviewId);
    return commentRepository.create({ userId, reviewId, body });
  },

  async deleteComment(userId: string, commentId: string) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw new NotFoundError("Comment not found");
    // 403 vs 404: the comment exists but isn't yours. (Returning 404 here
    // instead would hide its existence — a privacy choice; comments are
    // public anyway, so the honest 403 is fine.)
    if (comment.userId !== userId) {
      throw new ForbiddenError("You can only delete your own comments");
    }
    await commentRepository.delete(commentId);
  },

  async deleteReview(userId: string, reviewId: string) {
    const review = await getReviewOr404(reviewId);
    if (review.userId !== userId) {
      throw new ForbiddenError("You can only delete your own reviews");
    }
    await reviewRepository.delete(review.id, review.userId, review.bookId);
  },
};
