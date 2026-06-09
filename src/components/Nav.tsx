import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";

// Server component: reads the session cookie on the server, so auth state is
// correct on first paint — no client-side flash of "Log in". The avatar menu
// is a native <details> element: dropdown behavior with zero client JS.
export async function Nav() {
  const user = await getCurrentUser();

  return (
    <nav className="border-b border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 font-display text-lg font-semibold">
          🍃 Leaflet
        </Link>

        <form action="/books" className="min-w-0 flex-1">
          <input
            type="search"
            name="q"
            placeholder="Search books or authors…"
            className="w-full max-w-xs rounded border border-ink/15 bg-white/60 px-3 py-1.5 text-sm dark:bg-white/5"
          />
        </form>

        <div className="flex shrink-0 items-center gap-4 text-sm">
          <Link href="/books" className="hover:underline">
            Browse
          </Link>
          {user ? (
            <>
              <Link href="/shelves" className="hover:underline">
                Shelves
              </Link>
              <Link href="/people" className="hover:underline">
                People
              </Link>
              <details className="group relative">
                <summary className="list-none [&::-webkit-details-marker]:hidden">
                  <span className="cursor-pointer">
                    <Avatar
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                      size="sm"
                    />
                  </span>
                </summary>
                <div className="absolute right-0 z-10 mt-2 flex w-44 flex-col gap-2 rounded-lg border border-ink/10 bg-paper p-3 shadow-lg">
                  <Link
                    href={`/users/${user.username}`}
                    className="hover:underline"
                  >
                    @{user.username}
                  </Link>
                  <Link href="/shelves" className="hover:underline">
                    My shelves
                  </Link>
                  <LogoutButton />
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded bg-accent px-3 py-1.5 text-white hover:bg-accent-deep"
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
