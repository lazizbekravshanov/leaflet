import Image from "next/image";

const SIZES = { S: "w-12", M: "w-24", L: "w-40", feed: "w-16", full: "w-full" } as const;

// Covers are the product's only imagery, so they're held to a strict shape:
// exact 2:3, 10px radius, hairline border (scans have ragged edges — the
// border makes mismatched sources read as one set). object-cover normalizes
// the slightly-off aspect ratios Open Library serves.
export function BookCover({
  coverId,
  title,
  size = "M",
}: {
  coverId: number | null;
  title: string;
  size?: keyof typeof SIZES;
}) {
  if (!coverId) {
    return (
      <span
        className={`${SIZES[size]} flex aspect-2/3 items-center justify-center rounded-card border border-line bg-bg-subtle p-1.5 text-center font-display text-[11px] leading-tight text-ink-secondary`}
      >
        {title}
      </span>
    );
  }
  return (
    <Image
      src={`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`}
      alt={`Cover of ${title}`}
      width={180}
      height={270}
      className={`${SIZES[size]} aspect-2/3 rounded-card border border-line object-cover`}
    />
  );
}
