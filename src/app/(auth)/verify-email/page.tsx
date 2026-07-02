import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { VerifyEmailClient } from "./verify-email-client";

export const metadata: Metadata = {
  title: "Verify your email",
};

export default function VerifyEmailPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Verify your email
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Confirming your email keeps your account secure.
        </p>
      </div>

      <Suspense
        fallback={
          <p className="text-sm text-slate-500">Checking verification link…</p>
        }
      >
        <VerifyEmailClient />
      </Suspense>

      <p className="text-sm text-center text-slate-500 dark:text-slate-400">
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
