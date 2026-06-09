import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { userService } from "@/services/user.service";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { BookCover } from "@/components/BookCover";
import { ProfileTabs } from "@/components/ProfileTabs";
import { Stars } from "@/components/icons";
import { timeAgo } from "@/lib/time";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const [{ username }, viewer] = await Promise.all([params, getCurrentUser()]);

  let profile;
  try {
    profile = await userService.getProfile(
      decodeURIComponent(username),
      viewer?.id ?? null,
    );
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const { user, counts, isFollowing, shelves, reviews } = profile;
  const isMe = viewer?.id === user.id;
  const allShelved = shelves.flatMap((s) =>
    s.items.map((item) => ({ shelf: s.name, ...item })),
  );

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-12">
      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar username={user.username} avatarUrl={user.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[28px] font-semibold">
            {user.username}
          </h1>
          <p className="mt-0.5 text-[15px] text-ink-secondary">
            @{user.username}
            {user.bio && <> · {user.bio}</>}
          </p>
          <p className="tnum mt-1.5 text-[15px] text-ink-secondary">
            {counts.followers} follower{counts.followers === 1 ? "" : "s"} ·{" "}
            {counts.following} following
          </p>
        </div>
        {viewer && !isMe && (
          <FollowButton username={user.username} initialFollowing={isFollowing} />
        )}
        {isMe && (
          <Link
            href="/settings"
            className="rounded-control border border-line px-4 py-1.5 text-[15px] text-ink-secondary transition-colors duration-150 hover:text-ink"
          >
            Edit profile
          </Link>
        )}
      </header>

      <div className="mt-10">
        <ProfileTabs
          labels={["Reviews", "Shelves"]}
          panels={[
            <ReviewsPanel key="r" reviews={reviews} />,
            <ShelvesPanel key="s" items={allShelved} />,
          ]}
        />
      </div>
    </div>
  );
}

function ReviewsPanel({
  reviews,
}: {
  reviews: Array<{
    id: string;
    bookId: string;
    body: string;
    createdAt: Date;
    rating: number | null;
    book: { title: string };
  }>;
}) {
  if (reviews.length === 0) {
    return <p className="text-[15px] text-ink-secondary">No reviews yet.</p>;
  }
  return (
    <div className="mx-auto max-w-[640px] divide-y divide-line">
      {reviews.map((review) => (
        <article key={review.id} className="py-6">
          <div className="flex items-baseline gap-3">
            <h3 className="font-display min-w-0 truncate text-[21px] font-semibold">
              <Link href={`/books/${review.bookId}`} className="hover:text-accent">
                {review.book.title}
              </Link>
            </h3>
            <time
              dateTime={review.createdAt.toISOString()}
              className="ml-auto shrink-0 text-[13px] text-ink-secondary"
            >
              {timeAgo(review.createdAt)}
            </time>
          </div>
          {review.rating !== null && (
            <div className="mt-1.5">
              <Stars value={review.rating} />
            </div>
          )}
          <p className="mt-2.5 line-clamp-3 text-[17px] leading-[1.6]">
            {review.body}
          </p>
        </article>
      ))}
    </div>
  );
}

function ShelvesPanel({
  items,
}: {
  items: Array<{
    shelf: string;
    bookId: string;
    book: { title: string; coverId: number | null; authors: Array<{ author: { name: string } }> };
  }>;
}) {
  if (items.length === 0) {
    return <p className="text-[15px] text-ink-secondary">Nothing shelved yet.</p>;
  }
  return (
    <div className="grid grid-cols-3 gap-x-5 gap-y-8 sm:grid-cols-4 md:grid-cols-6">
      {items.map((item) => (
        <Link
          key={`${item.shelf}:${item.bookId}`}
          href={`/books/${item.bookId}`}
          className="group"
        >
          <div className="transition-transform duration-200 ease-(--ease) group-hover:scale-[1.02]">
            <BookCover
              coverId={item.book.coverId}
              title={item.book.title}
              size="full"
            />
          </div>
          <p className="mt-2 truncate text-[13px] font-medium">
            {item.book.title}
          </p>
          <p className="truncate text-[13px] text-ink-secondary">
            {item.book.authors.map((a) => a.author.name).join(", ")}
          </p>
        </Link>
      ))}
    </div>
  );
}
