import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { userService } from "@/services/user.service";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { BookCover } from "@/components/BookCover";

// Tabs live in the URL (?tab=reviews) instead of client state: the page stays
// a server component, tabs are linkable, and back/forward works.
export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ username }, { tab }, viewer] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);

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
  const activeTab = tab === "reviews" ? "reviews" : "shelves";
  const isMe = viewer?.id === user.id;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-5">
        <Avatar username={user.username} avatarUrl={user.avatarUrl} size="lg" />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">@{user.username}</h1>
          {user.bio && <p className="text-sm text-neutral-500">{user.bio}</p>}
          <p className="text-sm text-neutral-500">
            <strong>{counts.followers}</strong> follower
            {counts.followers === 1 ? "" : "s"} ·{" "}
            <strong>{counts.following}</strong> following ·{" "}
            <strong>{reviews.length}</strong> review
            {reviews.length === 1 ? "" : "s"}
          </p>
        </div>
        {viewer && !isMe && (
          <span className="ml-auto">
            <FollowButton
              username={user.username}
              initialFollowing={isFollowing}
            />
          </span>
        )}
      </header>

      <nav className="flex gap-4 border-b border-neutral-200 text-sm dark:border-neutral-800">
        {(["shelves", "reviews"] as const).map((t) => (
          <Link
            key={t}
            href={`/users/${user.username}${t === "reviews" ? "?tab=reviews" : ""}`}
            className={`-mb-px border-b-2 px-1 pb-2 capitalize ${
              activeTab === t
                ? "border-accent font-medium"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {t}
          </Link>
        ))}
      </nav>

      {activeTab === "shelves" ? (
        <div className="flex flex-col gap-6">
          {shelves.map((shelf) => (
            <section key={shelf.id}>
              <h2 className="mb-2 font-medium">
                {shelf.name}{" "}
                <span className="text-sm font-normal text-neutral-500">
                  ({shelf.items.length})
                </span>
              </h2>
              {shelf.items.length === 0 ? (
                <p className="text-sm text-neutral-500">Empty.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {shelf.items.map((item) => (
                    <Link
                      key={item.bookId}
                      href={`/books/${item.bookId}`}
                      title={item.book.title}
                    >
                      <BookCover
                        coverId={item.book.coverId}
                        title={item.book.title}
                        size="S"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.length === 0 && (
            <p className="text-sm text-neutral-500">No reviews yet.</p>
          )}
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="mb-1 flex items-center gap-2 text-sm">
                <Link
                  href={`/books/${review.bookId}`}
                  className="font-medium hover:underline"
                >
                  {review.book.title}
                </Link>
                {review.rating !== null && (
                  <span className="text-amber-500">
                    {"★".repeat(review.rating)}
                  </span>
                )}
                <span className="text-neutral-400">
                  {review.createdAt.toLocaleDateString()}
                </span>
              </div>
              <p className="line-clamp-3 whitespace-pre-line text-sm">
                {review.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
