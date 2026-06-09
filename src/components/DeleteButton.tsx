"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Generic "DELETE this resource" with an inline confirm step — no modal for
// a two-word decision. Server-side ownership checks are the real guard.
export function DeleteButton({ url, label }: { url: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function run() {
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-3 text-[13px]">
        <button onClick={run} className="font-medium text-ink hover:text-accent">
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-ink-secondary hover:text-ink"
        >
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-[13px] text-ink-secondary transition-colors duration-150 hover:text-ink"
    >
      {label}
    </button>
  );
}
