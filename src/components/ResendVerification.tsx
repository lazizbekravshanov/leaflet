"use client";

import { useState } from "react";

export function ResendVerification() {
  const [state, setState] = useState<"idle" | "sent">("idle");
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    await fetch("/api/auth/resend-verification", { method: "POST" });
    setState("sent");
    setBusy(false);
  }

  if (state === "sent") {
    return <span className="font-medium text-ink">Sent — check your inbox.</span>;
  }
  return (
    <button
      onClick={resend}
      disabled={busy}
      className="font-medium text-accent transition-colors duration-150 hover:text-accent-hover disabled:opacity-50"
    >
      {busy ? "Sending" : "Resend email"}
    </button>
  );
}
