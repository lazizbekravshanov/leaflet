import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Wordmark } from "@/components/icons";

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-[400px] flex-col items-center px-5 py-20">
      <Wordmark />
      <h1 className="font-display mt-6 text-[28px] font-semibold">
        Welcome back
      </h1>
      <div className="mt-8 w-full">
        <AuthForm mode="login" />
      </div>
      <p className="mt-6 text-[15px] text-ink-secondary">
        New here?{" "}
        <Link href="/signup" className="text-ink underline underline-offset-2 hover:text-accent">
          Create your shelf
        </Link>
      </p>
    </div>
  );
}
