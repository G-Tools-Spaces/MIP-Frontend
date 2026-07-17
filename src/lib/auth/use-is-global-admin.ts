"use client";

import { useQuery } from "@tanstack/react-query";
import { onboardingApi } from "@/lib/api/endpoints/onboarding";
import { useSession } from "@/stores/session-store";
import { ApiError } from "@/lib/api/problem";

/**
 * Determines whether the currently-authenticated user has the
 * {@code ROLE_PLATFORM_ADMIN} authority (i.e. is a Global / Platform Admin).
 *
 * Rationale:
 *   The MIP backend does not expose a dedicated "am I a platform admin?"
 *   endpoint and the JWT itself is opaque to the SPA. Instead we probe the
 *   platform-admin queue endpoint (which is guarded by
 *   {@code assertPlatformAdmin}). A 2xx response means the caller is a
 *   platform admin; a 403 (or any other non-2xx) means they are not.
 *
 *   The result is cached by React Query for the session so we don't
 *   re-probe on every render.
 */
export const useIsGlobalAdmin = (): {
  isGlobalAdmin: boolean;
  isLoading: boolean;
} => {
  const status = useSession((s) => s.status);
  const authed = status === "authenticated";

  const query = useQuery({
    queryKey: ["isGlobalAdmin"],
    enabled: authed,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      try {
        await onboardingApi.listOrgCreationQueue({ page: 0, size: 1 });
        return true;
      } catch (err) {
        if (err instanceof ApiError && (err.problem.status === 401 || err.problem.status === 403)) {
          return false;
        }
        // Network / unknown error — assume not admin to be safe.
        return false;
      }
    },
  });

  return {
    isGlobalAdmin: authed && query.data === true,
    isLoading: authed && query.isLoading,
  };
};
