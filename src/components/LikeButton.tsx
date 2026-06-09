"use client";

import { useState } from "react";

// A text button, not an icon in a circle. Optimistic: state flips instantly
// — fill, no bounce — then reconciles with the server's count. The
// POST/DELETE pair is idempotent server-side, so retries can't double-count.
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
    const data = (await res.json()) as { count: number };
    setCount(data.count);
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      aria-pressed={liked}
      title={disabled ? "Log in to like reviews" : undefined}
      className={`tnum transition-colors duration-150 disabled:opacity-50 ${
        liked
          ? "font-medium text-accent"
          : "text-ink-secondary hover:text-accent"
      }`}
    >
      {liked ? "Liked" : "Like"}
      {count > 0 ? ` ${count}` : ""}
    </button>
  );
}
