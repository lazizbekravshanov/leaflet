"use client";

import { useState } from "react";

// Clamped to 4 lines; "More" animates the full height open via a max-height
// transition (220ms). The full text is always in the DOM — the clamp is
// purely visual — so screen readers and find-in-page see everything.
export function ExpandableText({
  text,
  clampPx = 110, // ~4 lines at 17px/1.6
}: {
  text: string;
  clampPx?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  // Rough overflow check; a few characters of error only affects whether the
  // "More" button shows for borderline texts.
  const overflows = text.length > 260;

  return (
    <div>
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-(--ease)"
        style={{ maxHeight: expanded || !overflows ? "200em" : `${clampPx}px` }}
      >
        <p className="whitespace-pre-line text-[17px] leading-[1.6]">{text}</p>
      </div>
      {overflows && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="mt-1.5 text-[15px] text-ink-secondary transition-colors duration-150 hover:text-accent"
        >
          {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
