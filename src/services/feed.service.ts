import { ValidationError } from "@/lib/errors";
import { feedRepository, type FeedRow } from "@/repositories/feed.repository";
import type { FeedItemDto, FeedPageDto } from "@/lib/feed-types";

const PAGE_SIZE = 10;

export type FeedSort = "new" | "top";

export function parseSort(raw: string | null | undefined): FeedSort {
  return raw === "top" ? "top" : "new";
}

// The cursor is OPAQUE to clients: base64url-encoded JSON, the full ORDER BY
// key of the page. The FIRST element is a mode tag so a cursor minted in one
// sort mode can't be silently replayed against the other (their keys differ).
// Clients echo it back verbatim; we validate the shape on decode.
//
// new:  ["new", atISO, itemId]                  — keyset on (created_at, id)
// top:  ["top", snapshotAtMs, score, itemId]    — keyset on (score, id), where
//       snapshotAtMs FREEZES the age clock for the whole scroll (see repo).
function encodeNewCursor(at: Date, itemId: string): string {
  return Buffer.from(JSON.stringify(["new", at.toISOString(), itemId])).toString(
    "base64url",
  );
}

function encodeTopCursor(snapshotAtMs: number, score: number, itemId: string): string {
  return Buffer.from(
    JSON.stringify(["top", snapshotAtMs, score, itemId]),
  ).toString("base64url");
}

function decodeNewCursor(raw: string): { at: Date; itemId: string } {
  try {
    const arr = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (arr[0] !== "new") throw new Error();
    const at = new Date(arr[1] as string);
    if (Number.isNaN(at.getTime()) || typeof arr[2] !== "string") throw new Error();
    return { at, itemId: arr[2] };
  } catch {
    throw new ValidationError("Invalid cursor");
  }
}

function decodeTopCursor(raw: string): {
  snapshotAt: Date;
  score: number;
  itemId: string;
} {
  try {
    const arr = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (arr[0] !== "top") throw new Error();
    const snapshotAt = new Date(arr[1] as number);
    if (
      Number.isNaN(snapshotAt.getTime()) ||
      typeof arr[2] !== "number" ||
      typeof arr[3] !== "string"
    ) {
      throw new Error();
    }
    return { snapshotAt, score: arr[2], itemId: arr[3] };
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
  async getPage(
    userId: string,
    rawCursor: string | null,
    sort: FeedSort = "new",
  ): Promise<FeedPageDto> {
    return sort === "top"
      ? this.getRankedPage(userId, rawCursor)
      : this.getChronologicalPage(userId, rawCursor);
  },

  async getChronologicalPage(
    userId: string,
    rawCursor: string | null,
  ): Promise<FeedPageDto> {
    const cursor = rawCursor ? decodeNewCursor(rawCursor) : null;
    const rows = await feedRepository.list(userId, cursor, PAGE_SIZE);

    // Row limit+1 existing proves there's a next page; the last KEPT row
    // becomes the cursor.
    const hasMore = rows.length > PAGE_SIZE;
    const page = rows.slice(0, PAGE_SIZE);
    const last = page.at(-1);

    return {
      items: page.map(toDto),
      nextCursor: hasMore && last ? encodeNewCursor(last.at, last.item_id) : null,
    };
  },

  async getRankedPage(
    userId: string,
    rawCursor: string | null,
  ): Promise<FeedPageDto> {
    const cursor = rawCursor ? decodeTopCursor(rawCursor) : null;
    // First page captures the snapshot instant; later pages reuse the one
    // carried in the cursor, so age (and thus the whole ranking) is frozen for
    // the duration of the scroll.
    const snapshotAt = cursor ? cursor.snapshotAt : new Date();
    const rows = await feedRepository.listRanked(
      userId,
      snapshotAt,
      cursor ? { score: cursor.score, itemId: cursor.itemId } : null,
      PAGE_SIZE,
    );

    const hasMore = rows.length > PAGE_SIZE;
    const page = rows.slice(0, PAGE_SIZE);
    const last = page.at(-1);

    return {
      items: page.map(toDto),
      nextCursor:
        hasMore && last
          ? encodeTopCursor(snapshotAt.getTime(), last.score ?? 0, last.item_id)
          : null,
    };
  },
};
