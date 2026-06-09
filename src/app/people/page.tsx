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
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">People</h1>
        <p className="text-sm text-neutral-500">
          Follow readers to fill your feed.
        </p>
      </header>
      <div className="flex flex-col gap-3">
        {people
          .filter((p) => p.id !== viewer.id)
          .map((person) => (
            <div
              key={person.id}
              className="flex items-center gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <Avatar
                username={person.username}
                avatarUrl={person.avatarUrl}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/users/${person.username}`}
                  className="font-medium hover:underline"
                >
                  @{person.username}
                </Link>
                {person.bio && (
                  <p className="truncate text-sm text-neutral-500">
                    {person.bio}
                  </p>
                )}
                <p className="text-xs text-neutral-400">
                  {person._count.followers} follower
                  {person._count.followers === 1 ? "" : "s"} ·{" "}
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
