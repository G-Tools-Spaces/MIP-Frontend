"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "@/stores/session-store";
import { tokenStore } from "@/lib/auth/token-store";
import { onboardingApi } from "@/lib/api/endpoints/onboarding";

/**
 * Client-side auth guard for the (console) route group.
 *
 * Bounces users without a valid session token to /login, preserving the
 * originating path via ?returnTo=.
 *
 * SSR/CSR contract:
 *   The token lives in browser-only storage (sessionStorage / cookies) and
 *   is *not* available on the server. To keep hydration deterministic we
 *   always render the "checking" spinner on the server pass, then flip to
 *   either children or a redirect once mounted on the client. This avoids
 *   the "Hydration failed because the server rendered HTML didn't match
 *   the client" error we hit previously when reading tokenStore in a
 *   useState initializer.
 *
 * Hydration race note:
 *   The session-store rehydrates itself from sessionStorage on mount (see
 *   `useSessionHydration`). Until that finishes, `status` sits at "idle".
 *   If we redirect on "idle" we'll fight the login flow: TOTP verify
 *   writes to tokenStore + status="authenticated", the router pushes to
 *   /console, this guard mounts before the zustand subscription has flushed
 *   the new status, sees `!authenticated` and bounces to /login.
 *
 *   Fix: wait for `hydrated` (or a positive tokenStore read) BEFORE ever
 *   deciding "not authenticated".
 */
export const ConsoleAuthGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const status = useSession((s) => s.status);
  const hydrated = useSession((s) => s.hydrated);
  const organizationId = useSession((s) => s.organizationId);
  const user = useSession((s) => s.user);
  const setSession = useSession((s) => s.setSession);

  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Runs on the client after hydration - safe to touch browser storage.
    // We treat *any* of the following as "authenticated":
    //   - status === "authenticated" (zustand slice already populated)
    //   - a non-expired snapshot exists in tokenStore (survives hard refresh
    //     and covers the tiny window between setSession() and the store
    //     subscription firing in this component).
    const snap = tokenStore.get();
    const tokenValid = !!snap && !tokenStore.isExpired();
    setAuthenticated(tokenValid || status === "authenticated");
    setMounted(true);
  }, [status, hydrated]);

  useEffect(() => {
    // Only bounce once we've had a chance to observe post-hydration state.
    // If the session store has not hydrated yet, `status` may still be
    // "idle" while a valid token already exists in sessionStorage —
    // redirecting here would race the login flow.
    if (!mounted) return;
    if (!hydrated) return;
    if (authenticated) return;
    const returnTo = encodeURIComponent(pathname ?? "/console");
    router.replace(`/login?returnTo=${returnTo}`);
  }, [mounted, hydrated, authenticated, pathname, router]);

  // Self-heal: if the caller is authenticated but the session store has no
  // active organization bound (e.g. an older sign-in that predated the
  // login-form fix, or a hard refresh mid-onboarding), fetch their
  // memberships and bind the first ACTIVE one. This prevents org-scoped
  // pages from falling back to the "No organization context" warning.
  useEffect(() => {
    if (!mounted || !hydrated || !authenticated) return;
    if (organizationId) return;
    if (!user) return;
    const snap = tokenStore.get();
    if (!snap) return;
    let cancelled = false;
    (async () => {
      try {
        const memberships = await onboardingApi.myMemberships();
        if (cancelled) return;
        const active = memberships.find((m) => m.status === "ACTIVE");
        if (!active) return;
        const expiresIn = Math.max(
          1,
          Math.floor((snap.expiresAt - Date.now()) / 1000),
        );
        setSession({
          accessToken: snap.accessToken,
          expiresIn,
          user: { ...user, membershipId: active.membershipId },
          orgSlug: active.organizationSlug ?? undefined,
          organizationId: active.organizationId,
        });
      } catch {
        // Swallow — the "No organization context" warning is a safe fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, hydrated, authenticated, organizationId, user, setSession]);

  // Server render + first client render (pre-hydration) — always spinner
  // so the server-rendered HTML matches what React sees on the client.
  if (!mounted || !hydrated || !authenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
};
