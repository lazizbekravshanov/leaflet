import Link from "next/link";
import { recommendationService } from "@/services/recommendation.service";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import type { RecRow } from "@/repositories/recommendation.repository";

// "Who to follow" — served from the precomputed recommendations table (Phase 6).
// A server component, so the lazy refresh-on-read happens off the main thread of
// the page and this can sit in its own <Suspense>.
export async function WhoToFollow({ userId }: { userId: string }) {
  const recs = await recommendationService.getWhoToFollow(userId, 5);
  if (recs.length === 0) return null;

  return (
    <section className="mb-10 rounded-card border border-line p-5">
      <p className="eyebrow">Who to follow</p>
      <ul className="mt-4 flex flex-col gap-4">
        {recs.map((rec) => (
          <li key={rec.id} className="flex items-center gap-3">
            <Link
              href={`/users/${rec.username}`}
              aria-label={`${rec.username}'s profile`}
              className="shrink-0 rounded-full"
            >
              <Avatar username={rec.username} avatarUrl={rec.avatar_url} size="md" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/users/${rec.username}`}
                className="text-[15px] font-medium hover:text-accent"
              >
                {rec.username}
              </Link>
              <p className="truncate text-[13px] text-ink-secondary">
                {reasonText(rec)}
              </p>
            </div>
            <FollowButton username={rec.username} initialFollowing={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function reasonText(rec: RecRow): string {
  if (rec.reason === "mutuals" && rec.mutuals > 0) {
    return `Followed by ${rec.mutuals} ${rec.mutuals === 1 ? "reader" : "readers"} you follow`;
  }
  return "Similar taste in books";
}
