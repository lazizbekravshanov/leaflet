import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <div className="py-8">
      <h1 className="mb-6 text-center text-2xl font-semibold">Create account</h1>
      <AuthForm mode="signup" />
      <p className="mt-4 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-700 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
