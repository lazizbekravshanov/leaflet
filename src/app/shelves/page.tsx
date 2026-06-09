import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { shelfService } from "@/services/shelf.service";
import { BookCover } from "@/components/BookCover";

export default async function ShelvesPage() {
  const user = await getCurrentUser();
  // Page-level auth: redirect instead of 401 — this is a page, not an API.
  if (!user) redirect("/login");

  const shelves = await shelfService.listForUser(user.id);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">My Shelves</h1>
      {shelves.map((shelf) => (
        <section key={shelf.id}>
          <h2 className="mb-3 text-lg font-medium">
            {shelf.name}{" "}
            <span className="text-sm font-normal text-neutral-500">
              ({shelf.items.length})
            </span>
          </h2>
          {shelf.items.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nothing here yet —{" "}
              <Link href="/books" className="text-emerald-700 underline">
                find a book
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {shelf.items.map((item) => (
                <Link
                  key={item.bookId}
                  href={`/books/${item.bookId}`}
                  title={item.book.title}
                >
                  <BookCover
                    coverId={item.book.coverId}
                    title={item.book.title}
                    size="M"
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
