"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// One form for signup and login — they differ only by the username field and
// the endpoint. Client component because we want inline error messages from
// the API instead of a full-page round trip.
export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    // Session cookie is now set; refresh re-renders the server components
    // (Nav greeting, shelves) with the new auth state.
    router.push("/books");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      {mode === "signup" && (
        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]+"
            title="lowercase letters, digits, underscore"
            autoComplete="username"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : 1}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-emerald-700 py-2 text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
