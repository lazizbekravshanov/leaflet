"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/time";

export type CommentItem = {
  id: string;
  body: string;
  username: string;
  userId: string;
  createdAt: string;
};

// A text disclosure ("Comments 3"), not an icon button. Expanded comments sit
// behind a hairline left rule, conversation order.
export function CommentSection({
  reviewId,
  initialComments,
  currentUserId,
}: {
  reviewId: string;
  initialComments: CommentItem[];
  currentUserId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/reviews/${reviewId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        comment: { id: string; body: string; createdAt: string; user: { id: string; username: string } };
      };
      setComments([
        ...comments,
        {
          id: data.comment.id,
          body: data.comment.body,
          username: data.comment.user.username,
          userId: data.comment.user.id,
          createdAt: data.comment.createdAt,
        },
      ]);
      setBody("");
    }
    setBusy(false);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments(comments.filter((c) => c.id !== id));
  }

  return (
    <div className="min-w-0 flex-1 text-[15px]">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="tnum text-ink-secondary transition-colors duration-150 hover:text-accent"
      >
        {comments.length === 0 ? "Comment" : `Comments ${comments.length}`}
      </button>
      {open && (
        <div className="mt-4 flex flex-col gap-3 border-l border-line pl-4">
          {comments.map((c) => (
            <div key={c.id} className="flex items-baseline gap-2 text-[15px]">
              <span className="shrink-0 font-medium">{c.username}</span>
              <span className="min-w-0 flex-1">{c.body}</span>
              <span className="shrink-0 text-[13px] text-ink-secondary">
                {timeAgo(c.createdAt)}
              </span>
              {c.userId === currentUserId && (
                <button
                  onClick={() => remove(c.id)}
                  className="shrink-0 text-[13px] text-ink-secondary hover:text-ink"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          {currentUserId && (
            <form onSubmit={post} className="flex gap-2 pt-1">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={2000}
                placeholder="Add a comment"
                aria-label="Add a comment"
                className="flex-1 rounded-control bg-bg-subtle px-3 py-1.5 text-[15px] placeholder:text-ink-tertiary"
              />
              <button
                type="submit"
                disabled={busy}
                className="text-[15px] font-medium text-accent transition-colors duration-150 hover:text-accent-hover disabled:opacity-50"
              >
                Post
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
