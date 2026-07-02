import type { Metadata } from "next";
import { MfaChallengeForm } from "./mfa-challenge-form";

export const metadata: Metadata = {
  title: "Two-factor verification",
};

export default function MfaChallengePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Two-factor verification
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter the 6-digit code from your authenticator app to finish signing
          in.
        </p>
      </div>

      <MfaChallengeForm />
    </div>
  );
}
