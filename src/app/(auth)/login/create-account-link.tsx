"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * "Create one" affordance at the bottom of the login form.
 *
 * When arriving from an invitation flow the URL carries a
 * {@code ?returnTo=/accept-invitation?token=…} query param. We propagate
 * that to the register route so the new account, once verified, comes
 * back through the same redirect and lands on the accept-invitation
 * page automatically.
 */
export const CreateAccountLink = () => {
  const params = useSearchParams();
  const returnTo = params.get("returnTo");
  const href = returnTo
    ? `/register?returnTo=${encodeURIComponent(returnTo)}`
    : "/register";
  return (
    <p className="text-sm text-center text-slate-500 dark:text-slate-400">
      Don&apos;t have an account?{" "}
      <Link
        href={href}
        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
      >
        Create one
      </Link>
    </p>
  );
};
