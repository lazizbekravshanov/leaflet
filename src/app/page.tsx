import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { feedService } from "@/services/feed.service";
import { FeedList } from "@/components/FeedList";
import { FeedSkeleton } from "@/components/Skeletons";
import { SearchForm } from "@/components/SearchForm";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Your feed</h1>
      {/* The session check above is fast; the feed query is the slow part —
          Suspense streams the skeleton while it runs. */}
      <Suspense fallback={<FeedSkeleton />}>
        <FeedSection userId={user.id} />
      </Suspense>
    </div>
  );
}

async function FeedSection({ userId }: { userId: string }) {
  const page = await feedService.getPage(userId, null);

  if (page.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="max-w-sm text-neutral-500">
          Your feed is quiet — it shows reviews and shelvings from people you
          follow.
        </p>
        <Link
          href="/people"
          className="rounded bg-accent px-4 py-2 text-white hover:bg-accent-deep"
        >
          Find people to follow
        </Link>
      </div>
    );
  }

  return <FeedList initialItems={page.items} initialCursor={page.nextCursor} />;
}

function Landing() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-4xl font-bold">🍃 Leaflet</h1>
      <p className="max-w-md text-neutral-500">
        Track what you read, shelve what you&apos;ll read next, and tell people
        what was worth it.
      </p>
      <SearchForm />
      <p className="text-sm text-neutral-500">
        <Link href="/signup" className="text-accent underline">
          Sign up
        </Link>{" "}
        to start shelving books.
      </p>
    </div>
  );
}
