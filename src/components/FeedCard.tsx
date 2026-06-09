"use client";

import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { LikeButton } from "@/components/LikeButton";
import { ExpandableText } from "@/components/ExpandableText";
import type { FeedItemDto } from "@/lib/feed-types";

// Client component because feed pages beyond the first arrive via fetch —
// the whole list lives client-side after hydration.
export function FeedCard({ item }: { item: FeedItemDto }) {
  const date = new Date(item.at).toLocaleDateString();

  return (
    <article className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <Link href={`/books/${item.bookId}`} className="shrink-0">
        <BookCover coverId={item.coverId} title={item.bookTitle} size="S" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <Link href={`/users/${item.username}`} className="font-medium hover:underline">
            @{item.username}
          </Link>{" "}
          {item.kind === "review" ? (
            <>reviewed{" "}
              <Link href={`/books/${item.bookId}`} className="font-medium hover:underline">
                {item.bookTitle}
              </Link>
            </>
          ) : (
            <>
              shelved{" "}
              <Link href={`/books/${item.bookId}`} className="font-medium hover:underline">
                {item.bookTitle}
              </Link>{" "}
              as <em>{item.shelfName}</em>
            </>
          )}
          <span className="ml-2 text-neutral-400">{date}</span>
        </p>

        {item.kind === "review" && (
          <div className="mt-1 flex flex-col gap-2">
            {item.rating !== null && (
              <span className="text-sm text-amber-500">
                {"★".repeat(item.rating)}
                <span className="text-neutral-300 dark:text-neutral-600">
                  {"★".repeat(5 - item.rating)}
                </span>
              </span>
            )}
            {item.body && <ExpandableText text={item.body} />}
            <div className="flex items-center gap-4">
              <LikeButton
                reviewId={item.reviewId!}
                initialCount={item.likeCount}
                initialLiked={item.likedByMe}
              />
              <Link
                href={`/books/${item.bookId}`}
                className="text-sm text-neutral-500 hover:underline"
              >
                💬 {item.commentCount}
              </Link>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
