import { redirect } from "next/navigation";

// Alias: /search?q=… → /books?q=… (search lives on the browse page).
export default async function SearchRedirect({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `/books?q=${encodeURIComponent(q)}` : "/books");
}
