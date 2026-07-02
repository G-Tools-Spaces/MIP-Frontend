import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a password reset link for your MeiCrypt account.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Reset your password
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter your email and we&apos;ll send you a secure link to choose a new
          password.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-sm text-center text-slate-500 dark:text-slate-400">
        Remembered your password?{" "}
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
