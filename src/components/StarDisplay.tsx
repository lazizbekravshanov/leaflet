export function StarDisplay({
  value,
  count,
}: {
  value: number | null;
  count?: number;
}) {
  if (value === null) {
    return <span className="text-sm text-neutral-400">No ratings yet</span>;
  }
  const rounded = Math.round(value);
  return (
    <span className="text-sm">
      <span className="text-amber-500" aria-label={`${value.toFixed(1)} stars`}>
        {"★".repeat(rounded)}
        {"☆".repeat(5 - rounded)}
      </span>{" "}
      <span className="text-neutral-500">
        {value.toFixed(1)}
        {count !== undefined && ` · ${count} rating${count === 1 ? "" : "s"}`}
      </span>
    </span>
  );
}
