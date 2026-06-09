"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Optimistic follow/unfollow — same pattern as LikeButton, idempotent
// POST/DELETE pair server-side.
export function FollowButton({
  username,
  initialFollowing,
}: {
  username: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);

  async function toggle() {
    const snapshot = following;
    setFollowing(!following);
    const res = await fetch(`/api/users/${encodeURIComponent(username)}/follow`, {
      method: following ? "DELETE" : "POST",
    });
    if (!res.ok) {
      setFollowing(snapshot);
      return;
    }
    router.refresh(); // keep server-rendered follower counts in sync
  }

  return (
    <button
      onClick={toggle}
      className={`rounded px-3 py-1.5 text-sm ${
        following
          ? "border border-neutral-300 hover:border-red-400 hover:text-red-600 dark:border-neutral-700"
          : "bg-accent text-white hover:bg-accent-deep"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
