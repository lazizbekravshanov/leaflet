"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { LikeButton } from "@/components/LikeButton";
import { ExpandableText } from "@/components/ExpandableText";
import { Stars } from "@/components/icons";
import { timeAgo } from "@/lib/time";
import type { FeedItemDto } from "@/lib/feed-types";

// One feed item. Not a card: hairline rules and space do the separation
// (the list supplies both). One quiet meta line, then the book, then the
// words. Client component because pages 2+ arrive via fetch.
export function FeedCard({ item }: { item: FeedItemDto }) {
  return (
    <article className="py-7">
      <div className="flex items-center gap-2.5 text-[13px] text-ink-secondary">
        <Link
          href={`/users/${item.username}`}
          aria-label={`${item.username}'s profile`}
          className="shrink-0 rounded-full"
        >
          <Avatar username={item.username} avatarUrl={item.avatarUrl} size="sm" />
        </Link>
        <p className="min-w-0 truncate">
          <Link
            href={`/users/${item.username}`}
            className="font-medium text-ink hover:text-accent"
          >
            {item.username}
          </Link>{" "}
          {item.kind === "review" ? "reviewed" : `shelved as ${item.shelfName}`}
          <span aria-hidden> · </span>
          <time dateTime={item.at}>{timeAgo(item.at)}</time>
        </p>
      </div>

      <div className="mt-4 flex gap-5">
        <Link href={`/books/${item.bookId}`} className="shrink-0 self-start">
          <BookCover coverId={item.coverId} title={item.bookTitle} size="feed" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[21px] font-semibold leading-tight">
            <Link href={`/books/${item.bookId}`} className="hover:text-accent">
              {item.bookTitle}
            </Link>
          </h2>
          {item.bookAuthors && (
            <p className="mt-0.5 text-[15px] text-ink-secondary">
              {item.bookAuthors}
            </p>
          )}
          {item.kind === "review" && item.rating !== null && (
            <div className="mt-2">
              <Stars value={item.rating} />
            </div>
          )}
        </div>
      </div>

      {item.kind === "review" && item.body && (
        <div className="mt-4">
          <ExpandableText text={item.body} />
        </div>
      )}

      {item.kind === "review" && item.reviewId && (
        <div className="mt-4 flex items-center gap-6 text-[15px]">
          <LikeButton
            reviewId={item.reviewId}
            initialCount={item.likeCount}
            initialLiked={item.likedByMe}
          />
          <Link
            href={`/books/${item.bookId}`}
            className="tnum text-ink-secondary transition-colors duration-150 hover:text-accent"
          >
            {item.commentCount === 0
              ? "Comment"
              : `Comments ${item.commentCount}`}
          </Link>
        </div>
      )}
    </article>
  );
}
