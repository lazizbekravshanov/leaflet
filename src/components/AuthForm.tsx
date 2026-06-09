"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELD =
  "w-full rounded-control bg-bg-subtle px-3.5 py-2.5 text-[15px] placeholder:text-ink-tertiary";

// One form for signup and login — they differ by the username field and the
// endpoint. Errors are plain sentences in ink, inline under the form.
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
      setError(data?.error ?? "Something went wrong. Try again.");
      setBusy(false);
      return;
    }
    // Session cookie is set; refresh re-renders the server components (nav,
    // feed) with the new auth state.
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-[13px] font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={FIELD}
        />
      </div>
      {mode === "signup" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="text-[13px] font-medium">
            Username
          </label>
          <input
            id="username"
            name="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]+"
            title="lowercase letters, digits, underscore"
            autoComplete="username"
            className={FIELD}
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-[13px] font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : 1}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className={FIELD}
        />
      </div>
      {error && (
        <p role="alert" className="text-[15px]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-2 w-full rounded-control bg-accent py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
      >
        {mode === "signup" ? "Create your shelf" : "Log in"}
      </button>
    </form>
  );
}
