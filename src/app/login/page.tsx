import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="py-8">
      <h1 className="mb-6 text-center text-2xl font-semibold">Log in</h1>
      <AuthForm mode="login" />
      <p className="mt-4 text-center text-sm text-neutral-500">
        New here?{" "}
        <Link href="/signup" className="text-accent underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
