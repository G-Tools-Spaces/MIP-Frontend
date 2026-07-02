import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your MeiCrypt Identity account.",
};

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Sign in to your account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter your credentials to access your organization workspace.
        </p>
      </div>

      <Suspense fallback={<div className="h-72" />}>
        <LoginForm />
      </Suspense>

      <p className="text-sm text-center text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
