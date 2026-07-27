import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Set new password
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter a new password for your account.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
