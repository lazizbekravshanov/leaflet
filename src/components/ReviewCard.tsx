import { LikeButton } from "@/components/LikeButton";
import { CommentSection, type CommentItem } from "@/components/CommentSection";
import { DeleteButton } from "@/components/DeleteButton";
import { ExpandableText } from "@/components/ExpandableText";
import Link from "next/link";

// Server component shell with client islands (like, comments, delete) only
// where there's interaction. Dates cross the server→client boundary as
// strings — props must be serializable.
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
    <article className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <Link
          href={`/users/${review.user.username}`}
          className="font-medium hover:underline"
        >
          @{review.user.username}
        </Link>
        {review.rating !== null && (
          <span className="text-amber-500">{"★".repeat(review.rating)}</span>
        )}
        <span className="text-neutral-400">
          {review.createdAt.toLocaleDateString()}
        </span>
        {currentUserId === review.user.id && (
          <span className="ml-auto">
            <DeleteButton url={`/api/reviews/${review.id}`} label="delete" />
          </span>
        )}
      </div>
      <ExpandableText text={review.body} />
      <div className="mt-3 flex items-center gap-4">
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
