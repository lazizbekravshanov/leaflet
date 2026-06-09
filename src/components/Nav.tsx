import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

// Server component: reads the session cookie on the server, so auth state is
// correct on first paint — no client-side flash of "Log in".
export async function Nav() {
  const user = await getCurrentUser();

  return (
    <nav className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          🍃 Leaflet
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/books" className="hover:underline">
            Browse
          </Link>
          {user ? (
            <>
              <Link href="/shelves" className="hover:underline">
                My Shelves
              </Link>
              <span className="text-neutral-500">@{user.username}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded bg-emerald-700 px-3 py-1.5 text-white hover:bg-emerald-800"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
