import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { CreateAccountLink } from "./create-account-link";

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

      <Suspense fallback={null}>
        <CreateAccountLink />
      </Suspense>
    </div>
  );
}
