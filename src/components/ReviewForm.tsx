"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarIcon } from "@/components/icons";

// Pre-filled with the user's existing review when there is one — submitting
// again is an edit (the API upserts on (user_id, book_id)).
export function ReviewForm({
  bookId,
  initialBody = "",
  initialRating = 0,
}: {
  bookId: string;
  initialBody?: string;
  initialRating?: number;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState(0);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, body, rating }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong. Try again.");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh(); // re-render the server-side review list below
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div
        className="flex items-center gap-1"
        role="radiogroup"
        aria-label="Your rating"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            className="rounded-control"
          >
            <StarIcon filled={star <= (hovered || rating)} />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={4}
        placeholder="What was it actually like?"
        className="w-full rounded-control bg-bg-subtle px-3.5 py-2.5 text-[15px] placeholder:text-ink-tertiary"
      />
      {error && (
        <p role="alert" className="text-[15px]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || rating === 0}
        className="self-start rounded-control bg-accent px-4 py-2 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
      >
        {initialBody ? "Update review" : "Post review"}
      </button>
    </form>
  );
}
