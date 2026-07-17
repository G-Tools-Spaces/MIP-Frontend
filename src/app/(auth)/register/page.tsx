import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "./register-form";
import { SignInLink } from "./sign-in-link";

export const metadata: Metadata = {
  title: "Create your account",
};

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Create your account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Join an existing organization on MeiCrypt Identity.
        </p>
      </div>

      <Suspense fallback={<div className="h-96" />}>
        <RegisterForm />
      </Suspense>

      <Suspense fallback={null}>
        <SignInLink />
      </Suspense>
    </div>
  );
}
