import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { Wordmark } from "@/components/icons";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-[400px] flex-col items-center px-5 py-20">
      <Wordmark />
      <h1 className="font-display mt-6 text-[28px] font-semibold">
        Reset your password
      </h1>
      <p className="mt-2 text-center text-[15px] text-ink-secondary">
        Enter your email and we&rsquo;ll send a link to set a new one.
      </p>
      <div className="mt-8 w-full">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-[15px] text-ink-secondary">
        <Link href="/login" className="u-link">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
