"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SHELVES = [
  { type: "WANT_TO_READ", label: "Want to read" },
  { type: "READING", label: "Reading" },
  { type: "READ", label: "Read" },
] as const;

type ShelfType = (typeof SHELVES)[number]["type"];

// One hairline-bordered segmented control. The selected segment is the only
// accent-filled element on the book page besides the stars.
export function ShelfPicker({
  bookId,
  current,
}: {
  bookId: string;
  current: ShelfType | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ShelfType | null>(current);
  const [busy, setBusy] = useState(false);

  async function shelve(type: ShelfType) {
    setBusy(true);
    const previous = selected;
    setSelected(type); // optimistic; rolled back on failure
    const res = await fetch("/api/shelf-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, shelfType: type }),
    });
    if (!res.ok) setSelected(previous);
    setBusy(false);
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label="Shelf"
      className="inline-flex overflow-hidden rounded-control border border-line"
    >
      {SHELVES.map(({ type, label }, i) => (
        <button
          key={type}
          onClick={() => shelve(type)}
          disabled={busy}
          aria-pressed={selected === type}
          className={`px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 disabled:opacity-50 ${
            i > 0 ? "border-l border-line" : ""
          } ${
            selected === type
              ? "bg-accent text-white"
              : "text-ink-secondary hover:bg-bg-subtle hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
