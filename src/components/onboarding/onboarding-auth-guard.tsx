"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "@/stores/session-store";
import { tokenStore } from "@/lib/auth/token-store";

/**
 * Lightweight auth guard for the onboarding pages (choose, setup, setup-mfa).
 *
 * These pages require a valid session but live under the (auth) layout which
 * has no built-in session check. Without this guard, an unauthenticated visit
 * (e.g., after a hard refresh) results in the backend returning a bare Spring
 * Security 403 that the API client previously showed as "Unable to reach the
 * MeiCrypt Identity service."
 *
 * Behaviour:
 *   - Waits for the session store to rehydrate from sessionStorage.
 *   - If no valid token is found, redirects to /login.
 *   - Once authenticated, renders children.
 */
export const OnboardingAuthGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const status = useSession((s) => s.status);
  const hydrated = useSession((s) => s.hydrated);

  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Determine auth state after client mount (same pattern as ConsoleAuthGuard).
  useEffect(() => {
    const snap = tokenStore.get();
    const tokenValid = !!snap && !tokenStore.isExpired();
    setAuthenticated(tokenValid || status === "authenticated");
    setMounted(true);
  }, [status, hydrated]);

  // Redirect unauthenticated users to login, preserving the current path.
  useEffect(() => {
    if (!mounted) return;
    if (!hydrated) return;
    if (authenticated) return;
    router.replace("/login");
  }, [mounted, hydrated, authenticated, router]);

  if (!mounted || !hydrated || !authenticated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};
