import { recommendationRepository } from "@/repositories/recommendation.repository";

// How long a precomputed set is considered fresh. A real deployment would
// rebuild on a nightly cron; with no cron, we refresh LAZILY on read when the
// set is missing or older than this — the same online/offline split (cheap
// reads, occasional expensive recompute), just triggered by a visit instead of
// a schedule.
const FRESH_MS = 6 * 60 * 60 * 1000; // 6h

export const recommendationService = {
  async getWhoToFollow(userId: string, limit = 5) {
    const latest = await recommendationRepository.latestComputedAt(userId);
    const stale = !latest || Date.now() - latest.getTime() > FRESH_MS;
    if (stale) await recommendationRepository.refreshForUser(userId);
    return recommendationRepository.listForUser(userId, limit);
  },
};
