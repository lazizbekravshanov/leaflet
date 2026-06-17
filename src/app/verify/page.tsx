import Link from "next/link";
import { VerifyEmailClient } from "@/components/VerifyEmailClient";
import { Wordmark } from "@/components/icons";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto flex max-w-[400px] flex-col items-center px-5 py-20 text-center">
      <Wordmark />
      <h1 className="font-display mt-6 text-[28px] font-semibold">
        Verify your email
      </h1>
      <div className="mt-8 w-full">
        {token ? (
          <VerifyEmailClient token={token} />
        ) : (
          <p className="text-[15px] text-ink-secondary">
            This link is missing its token. Sign in and resend a fresh one from
            the banner, or head{" "}
            <Link href="/" className="u-link">
              home
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
