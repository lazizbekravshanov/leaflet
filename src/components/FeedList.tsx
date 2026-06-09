"use client";

import { useState } from "react";
import { FeedCard } from "@/components/FeedCard";
import type { FeedItemDto, FeedPageDto } from "@/lib/feed-types";

// First page arrives server-rendered (props); "Load more" appends pages via
// the API using the opaque cursor. Keyset pagination means loading more can
// never duplicate or skip an item, even while new activity lands.
export function FeedList({
  initialItems,
  initialCursor,
}: {
  initialItems: FeedItemDto[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [busy, setBusy] = useState(false);

  async function loadMore() {
    if (!cursor) return;
    setBusy(true);
    const res = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`);
    if (res.ok) {
      const page = (await res.json()) as FeedPageDto;
      setItems([...items, ...page.items]);
      setCursor(page.nextCursor);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <FeedCard key={`${item.kind}:${item.itemId}`} item={item} />
      ))}
      {cursor && (
        <button
          onClick={loadMore}
          disabled={busy}
          className="self-center rounded border border-neutral-300 px-4 py-2 text-sm hover:border-accent disabled:opacity-50 dark:border-neutral-700"
        >
          {busy ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
