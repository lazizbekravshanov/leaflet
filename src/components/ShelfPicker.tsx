"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SHELVES = [
  { type: "WANT_TO_READ", label: "Want to Read" },
  { type: "READING", label: "Reading" },
  { type: "READ", label: "Read" },
] as const;

type ShelfType = (typeof SHELVES)[number]["type"];

export function ShelfPicker({
  bookId,
  current,
}: {
  bookId: string;
  current: ShelfType | null;
}) {
  const router = useRouter();
  // Optimistic UI: flip the button immediately, reconcile with the server
  // via router.refresh() once the request lands.
  const [selected, setSelected] = useState<ShelfType | null>(current);
  const [busy, setBusy] = useState(false);

  async function shelve(type: ShelfType) {
    setBusy(true);
    const previous = selected;
    setSelected(type);
    const res = await fetch("/api/shelf-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, shelfType: type }),
    });
    if (!res.ok) setSelected(previous); // roll back the optimistic update
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {SHELVES.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => shelve(type)}
          disabled={busy}
          className={`rounded border px-3 py-1.5 text-sm disabled:opacity-50 ${
            selected === type
              ? "border-accent bg-accent text-white"
              : "border-neutral-300 hover:border-accent dark:border-neutral-700"
          }`}
        >
          {selected === type ? "✓ " : ""}
          {label}
        </button>
      ))}
    </div>
  );
}
