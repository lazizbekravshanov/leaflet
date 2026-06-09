"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Text tabs with a single 2px accent underline that slides between them.
// Both panels arrive server-rendered as props; switching is instant and the
// underline animates position/width — no pill backgrounds, no remount.
export function ProfileTabs({
  labels,
  panels,
}: {
  labels: [string, string];
  panels: [React.ReactNode, React.ReactNode];
}) {
  const [active, setActive] = useState(0);
  const tabRefs = [useRef<HTMLButtonElement>(null), useRef<HTMLButtonElement>(null)];
  const [bar, setBar] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = tabRefs[active]?.current;
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div>
      <div className="relative border-b border-line" role="tablist">
        {labels.map((label, i) => (
          <button
            key={label}
            ref={tabRefs[i]}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`px-1 pb-3 text-[15px] transition-colors duration-150 ${
              i > 0 ? "ml-7" : ""
            } ${active === i ? "font-medium text-ink" : "text-ink-secondary hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
        <span
          aria-hidden
          className="absolute bottom-[-1px] h-[2px] bg-accent transition-all duration-200 ease-(--ease)"
          style={{ left: bar.left, width: bar.width }}
        />
      </div>
      <div role="tabpanel" hidden={active !== 0} className="pt-8">
        {panels[0]}
      </div>
      <div role="tabpanel" hidden={active !== 1} className="pt-8">
        {panels[1]}
      </div>
    </div>
  );
}
