import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-5xl">📖</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-neutral-500">
        That page doesn&apos;t exist — maybe the book was never written, or the
        reader left.
      </p>
      <Link href="/" className="text-accent underline">
        Back to your feed
      </Link>
    </div>
  );
}
