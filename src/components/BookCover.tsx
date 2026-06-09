import Image from "next/image";

const SIZES = { S: "w-12", M: "w-24", L: "w-40" } as const;

export function BookCover({
  coverId,
  title,
  size = "M",
}: {
  coverId: number | null;
  title: string;
  size?: keyof typeof SIZES;
}) {
  if (!coverId) {
    return (
      <div
        className={`${SIZES[size]} flex aspect-2/3 items-center justify-center rounded bg-neutral-200 p-2 text-center text-xs text-neutral-500 dark:bg-neutral-800`}
      >
        {title}
      </div>
    );
  }
  return (
    <Image
      src={`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`}
      alt={`Cover of ${title}`}
      width={180}
      height={270}
      className={`${SIZES[size]} h-auto rounded shadow`}
    />
  );
}
