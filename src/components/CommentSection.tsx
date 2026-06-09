"use client";

import { useState } from "react";

export type CommentItem = {
  id: string;
  body: string;
  username: string;
  userId: string;
  createdAt: string;
};

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
    <div className="text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="text-neutral-500 hover:underline"
      >
        💬 {comments.length}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2 border-l-2 border-neutral-200 pl-3 dark:border-neutral-700">
          {comments.map((c) => (
            <div key={c.id} className="flex items-baseline gap-2">
              <span className="font-medium">@{c.username}</span>
              <span className="min-w-0 flex-1">{c.body}</span>
              {c.userId === currentUserId && (
                <button
                  onClick={() => remove(c.id)}
                  className="text-xs text-neutral-400 hover:text-red-600"
                >
                  delete
                </button>
              )}
            </div>
          ))}
          {currentUserId && (
            <form onSubmit={post} className="mt-1 flex gap-2">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={2000}
                placeholder="Add a comment…"
                className="flex-1 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                type="submit"
                disabled={busy}
                className="text-accent hover:underline disabled:opacity-50"
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
