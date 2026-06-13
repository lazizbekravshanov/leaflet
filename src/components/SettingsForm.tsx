"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// One 560px column. Labels above inputs; shared .field primitive (hairline at
// rest, accent border on focus). Hairline dividers group the fields.
// Validation messages are plain sentences in ink — no red, no toasts.
const FIELD = "field";

export function SettingsForm({
  initial,
}: {
  initial: { displayName: string; bio: string; avatarUrl: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues({ ...values, [key]: value });
    setMessage(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setMessage("Saved.");
      router.refresh();
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage(data?.error ?? "Something went wrong. Try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <div className="flex flex-col gap-2 pb-7">
        <label htmlFor="displayName" className="text-[13px] font-medium">
          Display name
        </label>
        <input
          id="displayName"
          value={values.displayName}
          onChange={(e) => set("displayName", e.target.value)}
          maxLength={50}
          placeholder="How your name appears"
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-line py-7">
        <label htmlFor="bio" className="text-[13px] font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          value={values.bio}
          onChange={(e) => set("bio", e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="A line about what you read"
          className={`${FIELD} resize-none`}
        />
        <p className="tnum text-[13px] text-ink-secondary">
          {280 - values.bio.length} characters left
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-line py-7">
        <label htmlFor="avatarUrl" className="text-[13px] font-medium">
          Avatar URL
        </label>
        <input
          id="avatarUrl"
          value={values.avatarUrl}
          onChange={(e) => set("avatarUrl", e.target.value)}
          maxLength={300}
          placeholder="https://"
          className={FIELD}
        />
        <p className="text-[13px] text-ink-secondary">
          Leave empty to use your monogram.
        </p>
      </div>

      <div className="flex items-center gap-4 border-t border-line pt-7">
        <button type="submit" disabled={busy} className="btn btn-primary">
          Save changes
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
