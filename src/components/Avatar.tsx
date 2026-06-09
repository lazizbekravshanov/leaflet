import Image from "next/image";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-base",
  lg: "h-20 w-20 text-2xl",
} as const;

// Initials placeholder when there's no avatarUrl — a deterministic background
// hue derived from the username so each user is visually distinct.
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
        className={`${SIZES[size]} rounded-full object-cover`}
      />
    );
  }
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.codePointAt(0)!) % 360;
  return (
    <span
      className={`${SIZES[size]} flex items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: `hsl(${hash} 45% 40%)` }}
      aria-hidden
    >
      {username.slice(0, 2).toUpperCase()}
    </span>
  );
}
