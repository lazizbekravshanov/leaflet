"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // refresh() re-runs the server components (Nav) so the header flips to
    // the signed-out state without a full reload.
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={logout} className="text-neutral-500 hover:underline">
      Log out
    </button>
  );
}
