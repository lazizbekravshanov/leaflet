import { ValidationError } from "@/lib/errors";
import { feedRepository, type FeedRow } from "@/repositories/feed.repository";
import type { FeedItemDto, FeedPageDto } from "@/lib/feed-types";

const PAGE_SIZE = 10;

// The cursor is OPAQUE to clients: base64url-encoded (timestamp, id) — the
// full ORDER BY key of the feed query. Clients echo it back verbatim; they
// can't meaningfully edit it, and we validate on decode anyway.
function encodeCursor(at: Date, itemId: string): string {
  return Buffer.from(JSON.stringify([at.toISOString(), itemId])).toString(
    "base64url",
  );
}

function decodeCursor(raw: string): { at: Date; itemId: string } {
  try {
    const [iso, itemId] = JSON.parse(
      Buffer.from(raw, "base64url").toString(),
    ) as [string, string];
    const at = new Date(iso);
    if (Number.isNaN(at.getTime()) || typeof itemId !== "string") throw new Error();
    return { at, itemId };
  } catch {
    throw new ValidationError("Invalid cursor");
  }
}

function toDto(row: FeedRow): FeedItemDto {
  return {
    kind: row.kind,
    itemId: row.item_id,
    at: row.at.toISOString(),
    username: row.username,
    avatarUrl: row.avatar_url,
    bookId: row.book_id,
    bookTitle: row.book_title,
    bookAuthors: row.book_authors,
    coverId: row.cover_id,
    reviewId: row.review_id,
    body: row.body,
    rating: row.rating,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    likedByMe: row.liked_by_me,
    shelfName: row.shelf_name,
  };
}

export const feedService = {
  async getPage(userId: string, rawCursor: string | null): Promise<FeedPageDto> {
    const cursor = rawCursor ? decodeCursor(rawCursor) : null;
    const rows = await feedRepository.list(userId, cursor, PAGE_SIZE);

    // Row limit+1 existing proves there's a next page; the last KEPT row
    // becomes the cursor.
    const hasMore = rows.length > PAGE_SIZE;
    const page = rows.slice(0, PAGE_SIZE);
    const last = page.at(-1);

    return {
      items: page.map(toDto),
      nextCursor: hasMore && last ? encodeCursor(last.at, last.item_id) : null,
    };
  },
};
