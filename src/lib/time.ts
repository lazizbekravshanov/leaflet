// Quiet relative time for feed meta lines: "now", "3h", "2d", "Mar 4".
// Single-letter units keep the meta line from competing with content.
export function timeAgo(date: Date | string): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.max(0, (Date.now() - then.getTime()) / 1000);

  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
