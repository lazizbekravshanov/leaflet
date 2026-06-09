import Link from "next/link";
import { Wordmark } from "@/components/icons";

// One row. Hairline top border. Nothing else.
export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-6 text-[13px] text-ink-secondary">
        <Wordmark className="text-[15px] text-ink" />
        <Link href="/books" className="hover:text-accent">
          Browse
        </Link>
        <Link href="/people" className="hover:text-accent">
          People
        </Link>
        <Link href="/login" className="hover:text-accent">
          Log in
        </Link>
        <span className="ml-auto">© 2026 Leaflet</span>
      </div>
    </footer>
  );
}
