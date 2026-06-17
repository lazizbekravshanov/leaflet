"use client";

import { useState } from "react";
import Link from "next/link";

export function VerifyEmailClient({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setState(res.ok ? "ok" : "error");
    setBusy(false);
  }

  if (state === "ok") {
    return (
      <p role="status" className="text-[15px]">
        Your email is verified.{" "}
        <Link href="/" className="u-link">
          Go to your feed
        </Link>
        .
      </p>
    );
  }
  if (state === "error") {
    return (
      <p role="alert" className="text-[15px] text-ink-secondary">
        This link is invalid or has expired. Sign in and resend a fresh one from
        the banner.
      </p>
    );
  }

  return (
    <button onClick={confirm} disabled={busy} className="btn btn-primary">
      {busy ? "Confirming" : "Confirm my email"}
    </button>
  );
}
