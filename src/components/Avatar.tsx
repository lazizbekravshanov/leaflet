import Image from "next/image";

const SIZES = {
  sm: "h-8 w-8 text-[13px]",
  md: "h-12 w-12 text-[15px]",
  lg: "h-20 w-20 text-[28px]",
} as const;

// Initials monogram on the subtle gray when there's no photo — quiet, no
// per-user colors competing with book covers.
export function Avatar({
  username,
  avatarUrl,
  size = "md",
}: {
  username: string;
  avatarUrl: string | null;
  size?: keyof typeof SIZES;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`@${username}`}
        width={80}
        height={80}
        // Users may point this at any host (settings page), so it bypasses
        // the optimizer and its remotePatterns allowlist.
        unoptimized
        className={`${SIZES[size]} rounded-full border border-line object-cover`}
      />
    );
  }
  return (
    <span
      className={`${SIZES[size]} flex items-center justify-center rounded-full bg-bg-subtle font-display font-semibold text-ink-secondary`}
      aria-hidden
    >
      {username.charAt(0).toUpperCase()}
    </span>
  );
}
