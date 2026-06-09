import Link from "next/link";
import { LikeButton } from "@/components/LikeButton";
import { CommentSection, type CommentItem } from "@/components/CommentSection";
import { DeleteButton } from "@/components/DeleteButton";
import { ExpandableText } from "@/components/ExpandableText";
import { Stars } from "@/components/icons";
import { timeAgo } from "@/lib/time";

// A review on the book page: hairline-ruled row (the list supplies divide-y),
// client islands only where there's interaction.
export type ReviewCardData = {
  id: string;
  body: string;
  createdAt: Date;
  rating: number | null;
  likeCount: number;
  likedByMe: boolean;
  user: { id: string; username: string };
  comments: Array<{
    id: string;
    body: string;
    createdAt: Date;
    user: { id: string; username: string };
  }>;
};

export function ReviewCard({
  review,
  currentUserId,
}: {
  review: ReviewCardData;
  currentUserId: string | null;
}) {
  const comments: CommentItem[] = review.comments.map((c) => ({
    id: c.id,
    body: c.body,
    username: c.user.username,
    userId: c.user.id,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <article className="py-6">
      <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
        <Link
          href={`/users/${review.user.username}`}
          className="font-medium text-ink hover:text-accent"
        >
          {review.user.username}
        </Link>
        {review.rating !== null && <Stars value={review.rating} />}
        <time dateTime={review.createdAt.toISOString()}>
          {timeAgo(review.createdAt)}
        </time>
        {currentUserId === review.user.id && (
          <span className="ml-auto">
            <DeleteButton url={`/api/reviews/${review.id}`} label="Delete" />
          </span>
        )}
      </div>
      <div className="mt-3">
        <ExpandableText text={review.body} />
      </div>
      <div className="mt-3 flex items-center gap-6 text-[15px]">
        <LikeButton
          reviewId={review.id}
          initialCount={review.likeCount}
          initialLiked={review.likedByMe}
          disabled={currentUserId === null}
        />
        <CommentSection
          reviewId={review.id}
          initialComments={comments}
          currentUserId={currentUserId}
        />
      </div>
    </article>
  );
}
