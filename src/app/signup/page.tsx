import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Wordmark } from "@/components/icons";

export default function SignupPage() {
  return (
    <div className="mx-auto flex max-w-[400px] flex-col items-center px-5 py-20">
      <Wordmark />
      <h1 className="font-display mt-6 text-[28px] font-semibold">
        Create your shelf
      </h1>
      <div className="mt-8 w-full">
        <AuthForm mode="signup" />
      </div>
      <p className="mt-6 text-[15px] text-ink-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-2 hover:text-accent">
          Log in
        </Link>
      </p>
    </div>
  );
}
