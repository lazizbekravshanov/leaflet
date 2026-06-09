"use client";

import { useState } from "react";

// Optimistic UI: state flips instantly on click, then the request runs. On
// failure we roll back to the snapshot. The POST/DELETE pair is idempotent
// server-side (composite PK + skipDuplicates), so a retry can't double-count.
export function LikeButton({
  reviewId,
  initialCount,
  initialLiked,
  disabled = false,
}: {
  reviewId: string;
  initialCount: number;
  initialLiked: boolean;
  disabled?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  async function toggle() {
    const snapshot = { liked, count };
    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));

    const res = await fetch(`/api/reviews/${reviewId}/like`, {
      method: liked ? "DELETE" : "POST",
    });
    if (!res.ok) {
      setLiked(snapshot.liked);
      setCount(snapshot.count);
      return;
    }
    // Reconcile with the server's authoritative count (another user may
    // have liked in between).
    const data = (await res.json()) as { count: number };
    setCount(data.count);
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      title={disabled ? "Log in to like reviews" : undefined}
      className={`flex items-center gap-1 text-sm disabled:opacity-50 ${
        liked ? "text-rose-700" : "text-neutral-500 hover:text-rose-700"
      }`}
    >
      {liked ? "♥" : "♡"} {count}
    </button>
  );
}
