"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Generic "DELETE this resource" button with a confirm step. Server-side
// ownership checks are the real guard — this is just UX.
export function DeleteButton({ url, label }: { url: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function run() {
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <button onClick={run} className="text-red-600 hover:underline">
          confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-neutral-400 hover:underline"
        >
          cancel
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-neutral-400 hover:text-red-600"
    >
      {label}
    </button>
  );
}
