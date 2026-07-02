"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "@/stores/session-store";
import { tokenStore } from "@/lib/auth/token-store";

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
 */
export const ConsoleAuthGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const status = useSession((s) => s.status);

  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Runs on the client after hydration - safe to touch browser storage.
    setAuthenticated(!!tokenStore.get() || status === "authenticated");
    setMounted(true);
  }, [status]);

  useEffect(() => {
    if (mounted && !authenticated) {
      const returnTo = encodeURIComponent(pathname ?? "/console");
      router.replace(`/login?returnTo=${returnTo}`);
    }
  }, [mounted, authenticated, pathname, router]);

  // Server render + first client render (pre-hydration) — always spinner
  // so the server-rendered HTML matches what React sees on the client.
  if (!mounted || !authenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
};
