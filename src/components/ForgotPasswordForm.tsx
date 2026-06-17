"use client";

import { useState } from "react";

export function ForgotPasswordForm() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    // Always the same outcome — we never reveal whether the email is registered.
    setDone(true);
    setBusy(false);
  }

  if (done) {
    return (
      <p role="status" className="text-[15px] text-ink-secondary">
        If an account exists for that email, a reset link is on its way. Check
        your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-[13px] font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary mt-2 w-full">
        {busy ? "Sending" : "Send reset link"}
      </button>
    </form>
  );
}
