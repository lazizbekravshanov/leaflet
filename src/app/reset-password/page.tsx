import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Wordmark } from "@/components/icons";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto flex max-w-[400px] flex-col items-center px-5 py-20">
      <Wordmark />
      <h1 className="font-display mt-6 text-[28px] font-semibold">
        Set a new password
      </h1>
      <div className="mt-8 w-full">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-[15px] text-ink-secondary">
            This link is missing its token. Request a fresh one from{" "}
            <Link href="/forgot-password" className="u-link">
              forgot password
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
