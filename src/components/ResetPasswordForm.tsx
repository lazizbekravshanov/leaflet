"use client";

import { useState } from "react";
import Link from "next/link";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: form.get("password") }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong. Try again.");
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  if (done) {
    return (
      <p role="status" className="text-[15px]">
        Your password has been reset, and other devices were signed out.{" "}
        <Link href="/login" className="u-link">
          Log in
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-[13px] font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
        />
      </div>
      {error && (
        <p role="alert" className="text-[15px]">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn btn-primary mt-2 w-full">
        {busy ? "Saving" : "Set new password"}
      </button>
    </form>
  );
}
