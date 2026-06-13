import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userService } from "@/services/user.service";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";

export default async function PeoplePage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const [people, myFollows] = await Promise.all([
    userService.listPeople(),
    prisma.follow.findMany({ where: { followerId: viewer.id } }),
  ]);
  const followingIds = new Set(myFollows.map((f) => f.followeeId));

  return (
    <div className="mx-auto max-w-[640px] px-5 py-12">
      <h1 className="font-display text-[28px] font-semibold">People</h1>
      <p className="mt-1 text-[15px] text-ink-secondary">
        Follow readers to fill your feed.
      </p>
      <div className="mt-8 divide-y divide-line">
        {people
          .filter((p) => p.id !== viewer.id)
          .map((person) => (
            <div key={person.id} className="flex items-center gap-4 py-5">
              <Link
                href={`/users/${person.username}`}
                aria-label={`${person.username}'s profile`}
                className="shrink-0 rounded-full"
              >
                <Avatar
                  username={person.username}
                  avatarUrl={person.avatarUrl}
                  size="md"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/users/${person.username}`}
                  className="text-[15px] font-medium hover:text-accent"
                >
                  {person.username}
                </Link>
                {person.bio && (
                  <p className="truncate text-[15px] text-ink-secondary">
                    {person.bio}
                  </p>
                )}
                <p className="tnum mt-0.5 text-[13px] text-ink-secondary">
                  {person.followerCount} follower
                  {person.followerCount === 1 ? "" : "s"} ·{" "}
                  {person._count.reviews} review
                  {person._count.reviews === 1 ? "" : "s"}
                </p>
              </div>
              <FollowButton
                username={person.username}
                initialFollowing={followingIds.has(person.id)}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
