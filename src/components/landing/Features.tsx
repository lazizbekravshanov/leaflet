import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/icons";
import type { Book } from "@/generated/prisma/client";

type ReviewSample = {
  body: string;
  rating: number | null;
  user: { username: string };
  book: Book;
};

// Three full-attention sections, one idea each, alternating backgrounds,
// text/media sides alternating. The "media" is the real product rendered
// small — not screenshots, not illustration.

function Section({
  id,
  eyebrow,
  title,
  copy,
  media,
  subtle = false,
  mediaLeft = false,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  copy: string;
  media: React.ReactNode;
  subtle?: boolean;
  mediaLeft?: boolean;
}) {
  return (
    <section id={id} className={subtle ? "bg-bg-subtle" : ""}>
      <div className="mx-auto grid max-w-[1080px] items-center gap-12 px-5 py-16 md:grid-cols-2 md:gap-16 md:py-32">
        <Reveal className={mediaLeft ? "md:order-2" : ""}>
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-ink-secondary">
            {eyebrow}
          </p>
          <h2 className="font-display mt-3 max-w-[18ch] text-[28px] font-semibold md:text-[40px]">
            {title}
          </h2>
          <p className="mt-4 max-w-[42ch] text-[17px] leading-[1.6] text-ink-secondary">
            {copy}
          </p>
        </Reveal>
        <Reveal className={mediaLeft ? "md:order-1" : ""}>{media}</Reveal>
      </div>
    </section>
  );
}

function ShelfComposition({ books }: { books: Book[] }) {
  const rows: Array<{ label: string; slice: Book[] }> = [
    { label: "Reading", slice: books.slice(0, 3) },
    { label: "Read", slice: books.slice(3, 8) },
  ];
  return (
    <div className="rounded-card border border-line bg-bg p-6">
      {rows.map(({ label, slice }, i) => (
        <div key={label} className={i > 0 ? "mt-6 border-t border-line pt-6" : ""}>
          <p className="text-[13px] text-ink-secondary">
            {label} <span className="tnum">· {slice.length}</span>
          </p>
          <div className="mt-3 flex gap-3">
            {slice.map((book) => (
              <BookCover key={book.id} coverId={book.coverId} title={book.title} size="S" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewComposition({ review }: { review: ReviewSample }) {
  return (
    <figure className="rounded-card border border-line bg-bg p-8">
      <p className="font-display text-[21px] font-semibold">{review.book.title}</p>
      <div className="mt-2 flex items-center gap-3 text-[13px] text-ink-secondary">
        {review.rating !== null && <Stars value={review.rating} />}
        <span>@{review.user.username}</span>
      </div>
      <blockquote className="mt-4 text-[17px] leading-[1.6] text-ink">
        {review.body.length > 240 ? `${review.body.slice(0, 240).trimEnd()}…` : review.body}
      </blockquote>
    </figure>
  );
}

function FeedComposition({ reviews }: { reviews: ReviewSample[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-bg">
      {reviews.map((review, i) => (
        <article
          key={`${review.user.username}-${review.book.id}`}
          className={`flex gap-4 p-6 ${i > 0 ? "border-t border-line" : ""}`}
        >
          <BookCover coverId={review.book.coverId} title={review.book.title} size="S" />
          <div className="min-w-0">
            <p className="text-[13px] text-ink-secondary">
              @{review.user.username} reviewed
            </p>
            <p className="font-display mt-0.5 text-[17px] font-semibold">
              {review.book.title}
            </p>
            {review.rating !== null && (
              <div className="mt-1">
                <Stars value={review.rating} />
              </div>
            )}
            <p className="mt-2 line-clamp-2 text-[15px] leading-[1.6] text-ink-secondary">
              {review.body}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function Features({
  books,
  review,
  feed,
}: {
  books: Book[];
  review: ReviewSample | null;
  feed: ReviewSample[];
}) {
  return (
    <>
      <Section
        id="shelves"
        subtle
        eyebrow="Shelves"
        title="Three shelves. The whole system."
        copy="Want to read, reading, read. Move a book with one click and Leaflet keeps the record straight."
        media={<ShelfComposition books={books} />}
      />
      {review && (
        <Section
          mediaLeft
          eyebrow="Reviews"
          title="Say what it was actually like."
          copy="A rating and a few honest sentences. One review per book, editable forever."
          media={<ReviewComposition review={review} />}
        />
      )}
      <Section
        subtle
        eyebrow="The feed"
        title="Follow readers, not algorithms."
        copy="A chronological feed of what the people you trust are reading and thinking. Nothing ranked, nothing inserted."
        media={<FeedComposition reviews={feed} />}
      />
    </>
  );
}

export function Closing() {
  return (
    <section className="px-5 py-20 md:py-32">
      <Reveal className="mx-auto flex max-w-[1080px] flex-col items-center gap-7 text-center">
        <p className="font-display max-w-[20ch] text-[28px] font-semibold md:text-[40px]">
          Reading is better with a record.
        </p>
        <Link
          href="/signup"
          className="rounded-control bg-accent px-5 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          Start your shelf
        </Link>
      </Reveal>
    </section>
  );
}
