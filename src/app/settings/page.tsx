import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-[560px] px-5 py-12">
      <h1 className="font-display text-[28px] font-semibold">Settings</h1>
      <p className="mt-1 text-[15px] text-ink-secondary">
        Signed in as @{user.username} · {user.email}
      </p>
      <div className="mt-10">
        <SettingsForm
          initial={{
            displayName: user.displayName ?? "",
            bio: user.bio ?? "",
            avatarUrl: user.avatarUrl ?? "",
          }}
        />
      </div>
    </div>
  );
}
