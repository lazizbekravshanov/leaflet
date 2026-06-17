import { getCurrentUser } from "@/lib/auth";
import { ResendVerification } from "@/components/ResendVerification";

// Slim, quiet nudge shown only to signed-in users who haven't verified their
// email. Server component (reads the session); the resend button is the only
// client island.
export async function VerifyBanner() {
  const user = await getCurrentUser();
  if (!user || user.emailVerifiedAt) return null;

  return (
    <div className="border-b border-line bg-bg-subtle">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-[13px] text-ink-secondary">
        <span>Confirm your email to secure your account.</span>
        <ResendVerification />
      </div>
    </div>
  );
}
