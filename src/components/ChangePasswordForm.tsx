"use client";

import { useState } from "react";

export function ChangePasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
      }),
    });
    if (res.ok) {
      setMessage("Password updated. Any other signed-in devices were logged out.");
      formEl.reset();
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage(data?.error ?? "Something went wrong. Try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="currentPassword" className="text-[13px] font-medium">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="newPassword" className="text-[13px] font-medium">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
        />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Updating" : "Change password"}
        </button>
        {message && (
          <p role="status" className="text-[15px] text-ink-secondary">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
