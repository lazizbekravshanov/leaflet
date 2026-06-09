"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/icons";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";

// 56px, white with slight blur, hairline border. The float shadow appears
// only once content has scrolled beneath it — at rest the nav is just a line.
export function NavShell({
  user,
}: {
  user: { username: string; avatarUrl: string | null } | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape and click-outside both close the menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur-md transition-shadow duration-200 ${
        scrolled ? "shadow-float" : ""
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-[1080px] items-center gap-6 px-5">
        <Link href="/" aria-label="Leaflet home">
          <Wordmark />
        </Link>

        {user && (
          <form action="/books" className="hidden min-w-0 flex-1 sm:block">
            <input
              type="search"
              name="q"
              placeholder="Search books or authors"
              aria-label="Search books or authors"
              className="w-full max-w-[280px] rounded-control bg-bg-subtle px-3 py-1.5 text-[15px] placeholder:text-ink-tertiary focus:outline-2 focus:outline-accent"
            />
          </form>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-5 text-[15px]">
          {user ? (
            <>
              <Link href="/books" className="hidden hover:text-accent sm:block">
                Browse
              </Link>
              <Link href="/shelves" className="hidden hover:text-accent sm:block">
                Shelves
              </Link>
              <Link href="/people" className="hover:text-accent">
                People
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                  className="block rounded-full"
                >
                  <Avatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 flex w-48 flex-col rounded-card border border-line bg-white py-1.5 shadow-float"
                  >
                    <Link
                      role="menuitem"
                      href={`/users/${user.username}`}
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-2 text-[15px] hover:bg-bg-subtle"
                    >
                      Profile
                    </Link>
                    <Link
                      role="menuitem"
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-2 text-[15px] hover:bg-bg-subtle"
                    >
                      Settings
                    </Link>
                    <div className="my-1.5 border-t border-line" />
                    <LogoutButton className="px-4 py-2 text-left text-[15px] text-ink-secondary hover:bg-bg-subtle" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-accent">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-control bg-accent px-3.5 py-1.5 text-white transition-colors duration-150 hover:bg-accent-hover"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
