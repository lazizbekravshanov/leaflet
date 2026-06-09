// Pure types shared between server (feed service) and client (feed UI).
// No runtime imports — safe to reference from client components.

export type FeedItemDto = {
  kind: "review" | "shelved";
  itemId: string;
  at: string; // ISO — Dates don't cross the server→client boundary
  username: string;
  avatarUrl: string | null;
  bookId: string;
  bookTitle: string;
  coverId: number | null;
  // review-only fields (null for shelved items)
  reviewId: string | null;
  body: string | null;
  rating: number | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  // shelved-only
  shelfName: string | null;
};

export type FeedPageDto = {
  items: FeedItemDto[];
  // Opaque cursor for the next page; null = no more items.
  nextCursor: string | null;
};
