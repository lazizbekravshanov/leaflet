import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SearchForm } from "@/components/SearchForm";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-4xl font-bold">🍃 Leaflet</h1>
      <p className="max-w-md text-neutral-500">
        Track what you read, shelve what you&apos;ll read next, and tell people
        what was worth it.
      </p>
      <SearchForm />
      {user ? (
        <p className="text-sm">
          Welcome back, @{user.username} —{" "}
          <Link href="/shelves" className="text-emerald-700 underline">
            your shelves
          </Link>
        </p>
      ) : (
        <p className="text-sm text-neutral-500">
          <Link href="/signup" className="text-emerald-700 underline">
            Sign up
          </Link>{" "}
          to start shelving books.
        </p>
      )}
    </div>
  );
}
