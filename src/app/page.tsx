import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { feedService, parseSort, type FeedSort } from "@/services/feed.service";
import { shelfService } from "@/services/shelf.service";
import { landingRepository } from "@/repositories/landing.repository";
import { FeedList } from "@/components/FeedList";
import { FeedSkeleton } from "@/components/Skeletons";
import { BookCover } from "@/components/BookCover";
import { Hero } from "@/components/landing/Hero";
import { Features, Closing } from "@/components/landing/Features";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const sort = parseSort((await searchParams).sort);

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-10 xl:grid xl:grid-cols-[1fr_640px_1fr] xl:gap-10">
      <div className="hidden xl:block" />
      <div className="mx-auto w-full max-w-[640px] xl:mx-0 xl:max-w-none">
        <FeedToggle sort={sort} />
        <Suspense key={sort} fallback={<FeedSkeleton />}>
          <FeedSection userId={user.id} sort={sort} />
        </Suspense>
      </div>
      <aside className="hidden xl:block">
        <Suspense>
          <CurrentlyReading userId={user.id} />
        </Suspense>
      </aside>
    </div>
  );
}

// Quiet segmented toggle: editorial, monochrome, the active tab carries the
// one ink-green accent. URL-driven (?sort=) so it's deep-linkable and the
// server renders the right feed — no client state for which mode is active.
function FeedToggle({ sort }: { sort: FeedSort }) {
  const tabs = [
    { key: "new" as const, label: "Latest", href: "/" },
    { key: "top" as const, label: "Top", href: "/?sort=top" },
  ];
  return (
    <div className="mb-2 flex gap-5 border-b border-line pb-3">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={
            sort === t.key
              ? "text-[15px] font-medium text-accent"
              : "text-[15px] text-ink-secondary transition-colors duration-150 hover:text-ink"
          }
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

async function FeedSection({
  userId,
  sort,
}: {
  userId: string;
  sort: FeedSort;
}) {
  const page = await feedService.getPage(userId, null, sort);

  if (page.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-24 text-center">
        <p className="font-display text-[28px] font-semibold">
          Your feed is waiting.
        </p>
        <p className="max-w-[36ch] text-[15px] text-ink-secondary">
          Follow a few readers and their reviews and shelves will appear here.
        </p>
        <Link
          href="/people"
          className="rounded-control bg-accent px-4 py-2 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          Find readers
        </Link>
      </div>
    );
  }

  return (
    <FeedList
      initialItems={page.items}
      initialCursor={page.nextCursor}
      sort={sort}
    />
  );
}

// Right rail, ≥1280px only: a quiet, label-light "Currently reading" module.
async function CurrentlyReading({ userId }: { userId: string }) {
  const shelves = await shelfService.listForUser(userId);
  const reading = shelves.find((s) => s.type === "READING");
  if (!reading || reading.items.length === 0) return null;

  return (
    <div className="sticky top-24">
      <p className="text-[13px] font-medium text-ink-secondary">
        Currently reading
      </p>
      <ul className="mt-4 flex flex-col gap-4">
        {reading.items.slice(0, 4).map((item) => (
          <li key={item.bookId}>
            <Link
              href={`/books/${item.bookId}`}
              className="group flex items-center gap-3"
            >
              <BookCover
                coverId={item.book.coverId}
                title={item.book.title}
                size="S"
              />
              <span className="text-[13px] leading-snug text-ink-secondary transition-colors duration-150 group-hover:text-accent">
                {item.book.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function Landing() {
  const [covers, featured, sample] = await Promise.all([
    landingRepository.coverBooks(9),
    landingRepository.featuredReview(),
    landingRepository.feedSample(2),
  ]);

  return (
    <>
      <Hero books={covers} />
      <Features books={covers} review={featured} feed={sample} />
      <Closing />
    </>
  );
}
