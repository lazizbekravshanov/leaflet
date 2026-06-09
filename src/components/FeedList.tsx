"use client";

import { useState } from "react";
import { FeedCard } from "@/components/FeedCard";
import type { FeedItemDto, FeedPageDto } from "@/lib/feed-types";

// Hairline rules between items, not boxes. First page arrives
// server-rendered; "Load more" is a quiet text button, not a spinner.
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
    <div>
      <div className="divide-y divide-line">
        {items.map((item) => (
          <FeedCard key={`${item.kind}:${item.itemId}`} item={item} />
        ))}
      </div>
      {cursor && (
        <div className="border-t border-line py-6 text-center">
          <button
            onClick={loadMore}
            disabled={busy}
            className="text-[15px] text-ink-secondary transition-colors duration-150 hover:text-accent disabled:opacity-50"
          >
            {busy ? "Loading" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
