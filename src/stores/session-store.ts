"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { tokenStore } from "@/lib/auth/token-store";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  /** Convenience: membership id for the active organization, when known. */
  membershipId?: string;
};

type SessionState = {
  user: SessionUser | null;
  organizationId: string | null;
  orgSlug: string | null;
  status: "idle" | "authenticated" | "unauthenticated" | "mfa_required";
  mfaChallengeId: string | null;
  mfaChallengeToken: string | null;
  mfaOrganizationId: string | null;
  /** Hydration flag — true once we've attempted to restore from tokenStore. */
  hydrated: boolean;
  setSession: (payload: {
    accessToken: string;
    expiresIn: number;
    user: SessionUser;
    orgSlug?: string;
    organizationId?: string;
  }) => void;
  setMfaChallenge: (
    challengeId: string,
    orgSlug?: string,
    challengeToken?: string,
    organizationId?: string,
  ) => void;
  setOrganization: (organizationId: string, orgSlug?: string) => void;
  hydrateFromTokenStore: () => void;
  clear: () => void;
};

export const useSession = create<SessionState>((set) => ({
  user: null,
  organizationId: null,
  orgSlug: null,
  status: "idle",
  mfaChallengeId: null,
  mfaChallengeToken: null,
  mfaOrganizationId: null,
  hydrated: false,

  setSession: ({ accessToken, expiresIn, user, orgSlug, organizationId }) => {
    tokenStore.set({
      accessToken,
      tokenType: "Bearer",
      expiresAt: Date.now() + expiresIn * 1000,
      orgSlug,
      organizationId,
      user,
    });
    set({
      user,
      orgSlug: orgSlug ?? null,
      organizationId: organizationId ?? null,
      status: "authenticated",
      mfaChallengeId: null,
      mfaChallengeToken: null,
      mfaOrganizationId: null,
      hydrated: true,
    });
  },

  /**
   * Restore the Zustand session slice from the persisted tokenStore
   * (sessionStorage) after a hard refresh. Safe to call multiple times;
   * a no-op if no snapshot exists or if state is already populated.
   */
  hydrateFromTokenStore: () => {
    const snap = tokenStore.get();
    if (!snap || !snap.user) {
      set({ hydrated: true, status: "unauthenticated" });
      return;
    }
    set({
      user: snap.user,
      orgSlug: snap.orgSlug ?? null,
      organizationId: snap.organizationId ?? null,
      status: "authenticated",
      mfaChallengeId: null,
      mfaChallengeToken: null,
      mfaOrganizationId: null,
      hydrated: true,
    });
  },

  setMfaChallenge: (challengeId, orgSlug, challengeToken, organizationId) => {
    set({
      status: "mfa_required",
      mfaChallengeId: challengeId,
      mfaChallengeToken: challengeToken ?? null,
      mfaOrganizationId: organizationId ?? null,
      orgSlug: orgSlug ?? null,
      user: null,
      organizationId: null,
    });
  },

  setOrganization: (organizationId, orgSlug) => {
    set((prev) => ({ ...prev, organizationId, orgSlug: orgSlug ?? prev.orgSlug }));
  },

  clear: () => {
    tokenStore.clear();
    set({
      user: null,
      orgSlug: null,
      organizationId: null,
      status: "unauthenticated",
      mfaChallengeId: null,
      mfaChallengeToken: null,
      mfaOrganizationId: null,
      hydrated: true,
    });
  },
}));

/**
 * Client component helper: rehydrates the session store from persisted
 * token snapshot exactly once per page load. Drop this hook into a top-level
 * client provider (see `AppProviders`) so every route benefits automatically.
 */
export const useSessionHydration = () => {
  const hydrated = useSession((s) => s.hydrated);
  const hydrate = useSession((s) => s.hydrateFromTokenStore);
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);
};

/** Selector helpers to avoid re-renders on unrelated changes. */
export const useCurrentOrgId = () =>
  useSession((s) => s.organizationId);
export const useCurrentOrgSlug = () => useSession((s) => s.orgSlug);
export const useCurrentUser = () => useSession((s) => s.user);
