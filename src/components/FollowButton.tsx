"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Accent-filled when not following; quiet hairline outline once following.
// Optimistic, idempotent POST/DELETE pair server-side.
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
      className={`btn ${following ? "btn-outline" : "btn-primary"}`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
