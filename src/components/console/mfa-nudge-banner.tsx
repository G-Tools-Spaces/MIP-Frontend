"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { mfaApi } from "@/lib/api/endpoints/mfa";
import { tokenStore } from "@/lib/auth/token-store";

const DISMISSED_KEY = "mfa_nudge_dismissed";

/**
 * Shows a warning banner in the console when the logged-in user has no
 * active MFA factors.  They can dismiss it for the session.
 *
 * The banner links to /account/profile/security where they can enrol TOTP
 * or a Passkey.
 */
export const MfaNudgeBanner = () => {
  const [dismissed, setDismissed] = useState(true); // start hidden (avoid flash)

  useEffect(() => {
    const v = sessionStorage.getItem(DISMISSED_KEY);
    if (!v) setDismissed(false);
  }, []);

  const { data: factors, isLoading } = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: () => mfaApi.listFactors(),
    enabled: !dismissed,
    staleTime: 60_000,
  });

  const hasNoFactors =
    !isLoading &&
    Array.isArray(factors) &&
    factors.filter((f: { status: string }) => f.status === "ACTIVE").length === 0;

  const snap = tokenStore.get();
  if (!snap) return null;
  if (dismissed || !hasNoFactors) return null;

  return (
    <div className="mx-4 mb-0 mt-2 lg:mx-8 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p className="flex-1">
        <strong>Your account has no multi-factor authentication set up.</strong>{" "}
        We strongly recommend setting up TOTP or a Passkey to protect your
        account.{" "}
        <Link
          href="/account/profile/security"
          className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100"
        >
          Set up MFA now →
        </Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          sessionStorage.setItem(DISMISSED_KEY, "1");
          setDismissed(true);
        }}
        className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
