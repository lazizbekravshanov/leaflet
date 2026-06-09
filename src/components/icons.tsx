// The product's entire icon set. SVG, stroke-free where possible, sized by
// the parent. No icon libraries — five stars and a wordmark are the visual
// vocabulary; everything else is text.

export function Wordmark({ className = "text-[19px]" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold tracking-tight ${className}`}>
      Leaflet
    </span>
  );
}

// One star, fillable 0..1 for fractional averages. Filled = accent, the rest
// of the star is a hairline outline — no gray fills competing with covers.
function Star({ fill }: { fill: number }) {
  const id = `s${Math.round(fill * 100)}`;
  return (
    <svg viewBox="0 0 20 20" className="h-[15px] w-[15px]" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="var(--accent)" />
          <stop offset={`${fill * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M10 1.8l2.47 5.13 5.63.77-4.12 3.93 1.02 5.59L10 14.5l-5 2.72 1.02-5.59L1.9 7.7l5.63-.77L10 1.8z"
        fill={`url(#${id})`}
        stroke="var(--line)"
        strokeWidth="1.2"
      />
    </svg>
  );
}

// Whole-star version for the review form's rating input.
export function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-6 w-6" aria-hidden="true">
      <path
        d="M10 1.8l2.47 5.13 5.63.77-4.12 3.93 1.02 5.59L10 14.5l-5 2.72 1.02-5.59L1.9 7.7l5.63-.77L10 1.8z"
        fill={filled ? "var(--accent)" : "transparent"}
        stroke={filled ? "var(--accent)" : "var(--ink-tertiary)"}
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function Stars({
  value,
  label,
}: {
  value: number; // 0..5, fractional ok
  label?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-[2px]"
      role="img"
      aria-label={label ?? `${value.toFixed(1)} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} fill={Math.min(Math.max(value - i, 0), 1)} />
      ))}
    </span>
  );
}
