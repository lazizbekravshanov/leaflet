// Demo content: 8 users, a realistic follow graph, ~40 reviews with ratings,
// likes, comments, and shelf entries — so the feed is alive on first run.
//
// Idempotency strategy: demo users all share the @leaflet.demo email domain;
// the seed DELETES them first and recreates from scratch. Cascades wipe their
// sessions, shelves, reviews, ratings, likes, comments, and follows in one
// statement — simpler and more reliable than upserting content that has no
// natural key (comments, likes).
//
// All "randomness" is deterministic arithmetic on indexes, so every machine
// seeds the identical dataset.
import bcrypt from "bcrypt";
import type { PrismaClient } from "../src/generated/prisma/client";

const USERS = [
  { username: "amelia", bio: "Reads one chapter past bedtime, every night." },
  { username: "ben", bio: "Sci-fi first, everything else second." },
  { username: "chloe", bio: "Annotating margins since 2009." },
  { username: "dmitri", bio: "Russian classics and long walks." },
  { username: "elena", bio: "Translated fiction enthusiast. 42 countries and counting." },
  { username: "felix", bio: "Fantasy maps are half the fun." },
  { username: "grace", bio: "Nonfiction by day, gothic novels by night." },
  { username: "hugo", bio: "Will read anything with a heist in it." },
] as const;

type Username = (typeof USERS)[number]["username"];

// follower -> people they follow. Hand-written to look organic: a couple of
// hubs (amelia, chloe), mutuals, and a few one-way follows.
const FOLLOWS: Record<Username, Username[]> = {
  amelia: ["ben", "chloe", "elena", "grace"],
  ben: ["amelia", "dmitri", "felix"],
  chloe: ["amelia", "ben", "felix", "grace", "hugo"],
  dmitri: ["ben", "elena"],
  elena: ["amelia", "chloe", "grace"],
  felix: ["chloe", "hugo", "amelia"],
  grace: ["amelia", "elena", "chloe", "ben"],
  hugo: ["felix", "chloe"],
};

// Review bodies — {title} is interpolated. Indexed deterministically so text,
// rating, and book line up differently per user.
const REVIEW_BODIES = [
  "I expected to bounce off {title} and instead lost a weekend to it. The opening third is slow on purpose — trust it. By the time the pieces click together you realize the slowness WAS the story being built under you.",
  "Finally got to {title} after years of meaning to. Verdict: the hype is mostly deserved. A few chapters sag in the middle, but the last fifty pages are as good as everyone says.",
  "{title} is one of those books where the plot summary undersells it completely. It's not about what happens — it's about the sentences. I kept reading paragraphs twice just to watch them work.",
  "Second read of {title} and it's a different book now. Things that felt like padding the first time are clearly load-bearing. Highly recommend a reread if it's been a few years.",
  "I wanted to love {title} more than I did. The ideas are enormous and the craft is real, but I never quite connected with anyone in it. Admired it more than I enjoyed it.",
  "Read {title} in three sittings. The pacing is relentless in the best way — every chapter ends with a hook that actually pays off instead of cheating you.",
  "{title} made me miss my stop twice this week. The characters argue like real people: badly, about the wrong things, at the worst times. That's the whole review.",
  "There's a stretch in the middle of {title} that I'd cut entirely, and yet the ending recontextualizes even that. Annoyingly well-constructed.",
  "{title} is bleaker than I expected and better than I hoped. Not a comfort read. Read it anyway, just not in winter.",
  "The thing nobody told me about {title}: it's funny. Genuinely, laugh-on-the-train funny, right up until it isn't, and the gear change is devastating.",
  "I have complicated feelings about {title}. The first half is a masterpiece. The second half is a different, slightly worse book wearing the first one's clothes. Still worth it.",
  "Gave {title} a second chance after abandoning it years ago. Whatever was wrong then was me, not the book. It's terrific — patient, precise, and quietly furious.",
  "{title} does in 300 pages what most series need 3000 for. Dense but never showy. I'll be thinking about the final chapter for a while.",
  "If you only know {title} from its reputation, the real thing is stranger and sadder than the legend. I see why it endures.",
  "Listened to half of {title}, read the other half. It's a rare book that survives both formats. The prose has an actual pulse.",
  "{title} earns its length, which I almost never say. Every subplot pays rent. My only complaint is that it ended.",
] as const;

const COMMENT_BODIES = [
  "This convinced me to bump it up my list.",
  "Completely agree about the middle section.",
  "Now I need to reread it. Thanks a lot.",
  "The gear change! Exactly this.",
  "I had the opposite reaction, weirdly — loved the second half more.",
  "Adding this to next month's stack.",
  "You always find the books that wreck me.",
  "Okay, sold. Borrowing your copy.",
  "This is a better review than the book deserves.",
  "Reading this one with my book club in March.",
  "The margins of my copy are full of arguments with chapter 12.",
  "Same experience on the train, missed my stop at Anna Karenina.",
] as const;

const HOUR = 60 * 60 * 1000;

export async function seedDemo(prisma: PrismaClient, bookIds: string[]) {
  // Wipe previous demo data (cascades take care of everything they own).
  await prisma.user.deleteMany({ where: { email: { endsWith: "@leaflet.demo" } } });

  // One bcrypt hash reused for all 8 (same password -> hashing 8 times at
  // cost 12 would only add ~2s of seed time for zero demo value).
  const passwordHash = bcrypt.hashSync("password123", 12);
  const now = Date.now();

  // Users + their default shelves.
  const users: { id: string; username: Username }[] = [];
  for (const [i, u] of USERS.entries()) {
    const user = await prisma.user.create({
      data: {
        username: u.username,
        email: `${u.username}@leaflet.demo`,
        passwordHash,
        bio: u.bio,
        createdAt: new Date(now - (45 - i) * 24 * HOUR),
        shelves: {
          create: [
            { name: "Want to Read", type: "WANT_TO_READ" },
            { name: "Reading", type: "READING" },
            { name: "Read", type: "READ" },
          ],
        },
      },
    });
    users.push({ id: user.id, username: u.username });
  }
  const idOf = new Map(users.map((u) => [u.username, u.id]));

  // Follow graph.
  await prisma.follow.createMany({
    data: Object.entries(FOLLOWS).flatMap(([follower, followees]) =>
      followees.map((followee) => ({
        followerId: idOf.get(follower as Username)!,
        followeeId: idOf.get(followee)!,
      })),
    ),
  });

  // Shelves + reviews per user. User i works through a deterministic slice of
  // the catalog: stride keeps users on different books with some overlap.
  let reviewCount = 0;
  const reviewIds: string[] = [];
  for (const [i, user] of users.entries()) {
    const shelves = await prisma.shelf.findMany({ where: { userId: user.id } });
    const shelfByType = new Map(shelves.map((s) => [s.type, s.id]));
    const pick = (k: number) => bookIds[(i * 17 + k * 7) % bookIds.length]!;

    // 9 shelved books: 5 read, 2 reading, 2 want-to-read.
    const read = [0, 1, 2, 3, 4].map(pick);
    const reading = [5, 6].map(pick);
    const wantToRead = [7, 8].map(pick);
    await prisma.shelfItem.createMany({
      data: [
        ...read.map((bookId, k) => ({
          shelfId: shelfByType.get("READ")!,
          bookId,
          addedAt: new Date(now - (i * 5 + k * 31) * HOUR),
        })),
        ...reading.map((bookId, k) => ({
          shelfId: shelfByType.get("READING")!,
          bookId,
          addedAt: new Date(now - (i * 3 + k * 13) * HOUR),
        })),
        ...wantToRead.map((bookId, k) => ({
          shelfId: shelfByType.get("WANT_TO_READ")!,
          bookId,
          addedAt: new Date(now - (i * 2 + k * 9) * HOUR),
        })),
      ],
      skipDuplicates: true, // strides can collide on small catalogs
    });

    // 5 reviews each (8 users x 5 = 40), on books from their READ shelf.
    for (const [k, bookId] of read.entries()) {
      const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
      const body = REVIEW_BODIES[(i * 5 + k) % REVIEW_BODIES.length]!.replaceAll(
        "{title}",
        book.title,
      );
      const rating = 2 + ((i * 3 + k * 5) % 4); // 2..5, varied, skews none
      const createdAt = new Date(now - (i * 11 + k * 53) * HOUR);
      const review = await prisma.review.create({
        data: { userId: user.id, bookId, body, createdAt },
      });
      await prisma.rating.create({
        data: { userId: user.id, bookId, value: rating, createdAt },
      });
      reviewIds.push(review.id);
      reviewCount++;
    }
  }

  // Likes: each user likes ~6 other people's reviews (PK dedupes overlaps).
  await prisma.like.createMany({
    data: users.flatMap((user, i) =>
      [0, 1, 2, 3, 4, 5].map((k) => ({
        userId: user.id,
        reviewId: reviewIds[(i * 13 + k * 3 + 5) % reviewIds.length]!,
      })),
    ),
    skipDuplicates: true,
  });
  // Self-likes are legal but look odd in a demo — drop them.
  await prisma.$executeRaw`
    DELETE FROM likes USING reviews
     WHERE likes.review_id = reviews.id AND likes.user_id = reviews.user_id`;

  // Comments: ~2 per user on other people's reviews.
  for (const [i, user] of users.entries()) {
    for (const k of [0, 1]) {
      const review = await prisma.review.findUniqueOrThrow({
        where: { id: reviewIds[(i * 7 + k * 19 + 11) % reviewIds.length]! },
      });
      if (review.userId === user.id) continue;
      await prisma.comment.create({
        data: {
          userId: user.id,
          reviewId: review.id,
          body: COMMENT_BODIES[(i * 2 + k) % COMMENT_BODIES.length]!,
          createdAt: new Date(review.createdAt.getTime() + (k + 1 + i) * HOUR),
        },
      });
    }
  }

  // Reconcile the denormalized counters (Phase 2). This seed inserts likes and
  // follows in bulk via createMany — the right tool for a seed — which
  // deliberately BYPASSES the per-write counter maintenance in the like/follow
  // repositories. So we recompute the counters from their source rows once, at
  // the end: the same backfill the migration runs, and the same "bulk path
  // skips maintenance, then reconciles" pattern real systems use. Without this,
  // every seeded review would show like_count 0 in the feed.
  await prisma.$executeRaw`
    UPDATE reviews r SET like_count = COALESCE(c.n, 0)
      FROM (SELECT review_id, COUNT(*)::int AS n FROM likes GROUP BY review_id) c
     WHERE c.review_id = r.id`;
  await prisma.$executeRaw`UPDATE reviews SET like_count = 0
     WHERE id NOT IN (SELECT DISTINCT review_id FROM likes)`;
  await prisma.$executeRaw`
    UPDATE users u SET
      follower_count  = (SELECT COUNT(*) FROM follows f WHERE f.followee_id = u.id),
      following_count = (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id)`;

  // Phase 5 caches/counters — same bulk-bypass reconcile.
  await prisma.$executeRaw`
    UPDATE reviews r SET comment_count = COALESCE(c.n, 0)
      FROM (SELECT review_id, COUNT(*)::int AS n FROM comments GROUP BY review_id) c
     WHERE c.review_id = r.id`;
  await prisma.$executeRaw`UPDATE reviews SET comment_count = 0
     WHERE id NOT IN (SELECT DISTINCT review_id FROM comments)`;
  await prisma.$executeRaw`
    UPDATE users u SET review_count = (SELECT COUNT(*) FROM reviews rv WHERE rv.user_id = u.id)`;
  await prisma.$executeRaw`
    UPDATE books b SET rating_count = COALESCE(c.n, 0), avg_rating = c.avg
      FROM (SELECT book_id, COUNT(*)::int AS n, AVG(value)::float8 AS avg FROM ratings GROUP BY book_id) c
     WHERE c.book_id = b.id`;
  await prisma.$executeRaw`UPDATE books SET rating_count = 0, avg_rating = NULL
     WHERE id NOT IN (SELECT DISTINCT book_id FROM ratings)`;

  // Demo accounts are pre-verified so the demo feed isn't covered by the
  // verify banner.
  await prisma.$executeRaw`UPDATE users SET email_verified_at = now()
     WHERE email LIKE '%@leaflet.demo'`;

  console.log(
    `Demo: ${users.length} users, ${reviewCount} reviews, follows/likes/comments in place.`,
  );
}
