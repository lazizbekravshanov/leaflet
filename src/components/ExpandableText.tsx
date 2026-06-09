"use client";

import { useState } from "react";

export function ExpandableText({
  text,
  limit = 280,
}: {
  text: string;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= limit) {
    return <p className="whitespace-pre-line text-sm">{text}</p>;
  }
  return (
    <p className="whitespace-pre-line text-sm">
      {expanded ? text : `${text.slice(0, limit).trimEnd()}… `}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-accent hover:underline"
      >
        {expanded ? " read less" : "read more"}
      </button>
    </p>
  );
}
