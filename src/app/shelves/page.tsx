import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { shelfService } from "@/services/shelf.service";
import { BookCover } from "@/components/BookCover";

export default async function ShelvesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const shelves = await shelfService.listForUser(user.id);

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-12">
      <h1 className="font-display text-[28px] font-semibold">My shelves</h1>
      <div className="mt-8 flex flex-col gap-12">
        {shelves.map((shelf) => (
          <section key={shelf.id}>
            <h2 className="border-b border-line pb-3 text-[15px] font-medium">
              {shelf.name}{" "}
              <span className="tnum font-normal text-ink-secondary">
                {shelf.items.length}
              </span>
            </h2>
            {shelf.items.length === 0 ? (
              <p className="mt-4 text-[15px] text-ink-secondary">
                Nothing here yet —{" "}
                <Link
                  href="/books"
                  className="text-ink underline underline-offset-2 hover:text-accent"
                >
                  find a book
                </Link>
                .
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-x-5 gap-y-8 sm:grid-cols-4 md:grid-cols-6">
                {shelf.items.map((item) => (
                  <Link
                    key={item.bookId}
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
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
