"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      setError(data?.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh(); // re-render the server-side review list below
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className={`text-2xl ${star <= rating ? "text-amber-500" : "text-neutral-300 dark:text-neutral-600"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={4}
        placeholder="What did you think?"
        className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy || rating === 0}
        className="self-start rounded bg-accent px-4 py-2 text-sm text-white hover:bg-accent-deep disabled:opacity-50"
      >
        {initialBody ? "Update review" : "Post review"}
      </button>
    </form>
  );
}
