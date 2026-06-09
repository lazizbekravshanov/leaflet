import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-32 text-center">
      <h1 className="font-display text-[40px] font-semibold">
        This page is missing.
      </h1>
      <p className="max-w-sm text-[15px] text-ink-secondary">
        The book was never written, or the reader moved on.
      </p>
      <Link href="/" className="text-[15px] text-accent hover:underline">
        Back to Leaflet
      </Link>
    </div>
  );
}
