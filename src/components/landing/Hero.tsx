import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import type { Book } from "@/generated/prisma/client";

// The hero's only visual is the product's actual content: a row of real
// seeded covers at varying heights, baseline-aligned and slightly
// overlapping, like books leaning on a shelf. No rotation, no illustration —
// rectilinear and calm.
const WIDTHS = [
  "w-[72px] sm:w-[88px]",
  "w-[60px] sm:w-[76px]",
  "w-[80px] sm:w-[96px]",
  "w-[64px] sm:w-[80px]",
  "w-[76px] sm:w-[92px]",
  "w-[58px] sm:w-[72px]",
  "w-[82px] sm:w-[100px]",
  "w-[66px] sm:w-[84px]",
  "w-[74px] sm:w-[90px]",
];

export function Hero({ books }: { books: Book[] }) {
  return (
    <section className="px-5 pb-20 pt-16 md:pb-28 md:pt-28">
      <div className="mx-auto flex max-w-[1080px] flex-col items-center text-center">
        <h1 className="font-display max-w-[16ch] text-[44px] font-semibold sm:text-[56px] md:text-[64px]">
          Every book you read, remembered.
        </h1>
        <p className="mt-5 max-w-[44ch] text-[17px] text-ink-secondary md:text-[21px]">
          Shelves, ratings, and honest reviews — your reading life, kept in
          one quiet place.
        </p>
        <div className="mt-8 flex items-center gap-6">
          <Link
            href="/signup"
            className="rounded-control bg-accent px-5 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
          >
            Start your shelf
          </Link>
          <Link
            href="#shelves"
            className="text-[15px] text-ink-secondary transition-colors duration-150 hover:text-accent"
          >
            See how it works
          </Link>
        </div>

        <Reveal className="mt-16 w-full md:mt-24">
          <div
            className="flex items-end justify-center overflow-hidden"
            aria-label="A shelf of book covers"
            role="img"
          >
            {books.map((book, i) => (
              <Image
                key={book.id}
                src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                alt=""
                width={180}
                height={270}
                priority={i < 5}
                className={`${WIDTHS[i % WIDTHS.length]} ${
                  i > 0 ? "-ml-2" : ""
                } aspect-2/3 shrink-0 rounded-[6px] border border-line object-cover`}
                style={{ zIndex: i % 2 === 0 ? 2 : 1 }}
              />
            ))}
          </div>
          <div className="mx-auto mt-[-1px] h-px max-w-[760px] bg-line" />
        </Reveal>
      </div>
    </section>
  );
}
