import { NotFoundError, ValidationError } from "@/lib/errors";
import { requireString } from "@/lib/validate";
import { userRepository } from "@/repositories/user.repository";
import { followRepository } from "@/repositories/follow.repository";
import { shelfRepository } from "@/repositories/shelf.repository";
import { prisma } from "@/lib/db";

export const userService = {
  // Everything the profile page needs. The queries are independent, so they
  // run concurrently (same pattern as the book page).
  async getProfile(username: string, viewerId: string | null) {
    const user = await userRepository.findByUsername(username);
    if (!user) throw new NotFoundError("User not found");

    const [counts, isFollowing, shelves, reviews, ratings] = await Promise.all([
      followRepository.counts(user.id),
      viewerId ? followRepository.isFollowing(viewerId, user.id) : false,
      shelfRepository.listForUser(user.id),
      userRepository.listReviewsByUser(user.id),
      prisma.rating.findMany({ where: { userId: user.id } }),
    ]);

    const ratingByBook = new Map(ratings.map((r) => [r.bookId, r.value]));
    return {
      user: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      counts,
      isFollowing,
      shelves,
      reviews: reviews.map((r) => ({
        ...r,
        rating: ratingByBook.get(r.bookId) ?? null,
      })),
    };
  },

  listPeople() {
    return userRepository.listAll();
  },

  // Settings form. Empty strings normalize to NULL — "cleared" and "never
  // set" are the same state, and the UI shouldn't render empty bios.
  async updateProfile(
    userId: string,
    input: { displayName: unknown; bio: unknown; avatarUrl: unknown },
  ) {
    const displayName = optionalString(input.displayName, "display name", 50);
    const bio = optionalString(input.bio, "bio", 280);
    const avatarUrl = optionalString(input.avatarUrl, "avatar URL", 300);
    if (avatarUrl !== null && !/^https:\/\/.+/.test(avatarUrl)) {
      throw new ValidationError("Avatar URL must start with https://");
    }
    return userRepository.updateProfile(userId, { displayName, bio, avatarUrl });
  },
};

function optionalString(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  const s = requireString(value, field, { max });
  return s.length === 0 ? null : s;
}
