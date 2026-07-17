"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * "Already have an account? Sign in" link at the bottom of the register
 * page. Propagates any {@code ?returnTo=…} query param through to the
 * login route so users arriving via an invitation link stay on the
 * accept-invitation flow after signing in.
 */
export const SignInLink = () => {
  const params = useSearchParams();
  const returnTo = params.get("returnTo");
  const href = returnTo
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/login";
  return (
    <p className="text-sm text-center text-slate-500 dark:text-slate-400">
      Already have an account?{" "}
      <Link
        href={href}
        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
      >
        Sign in
      </Link>
    </p>
  );
};
