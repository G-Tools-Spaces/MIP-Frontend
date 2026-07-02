"use client";

import { api } from "@/lib/api/client";

/**
 * Auth endpoints — wire-compatible with the MIP Spring Boot backend
 * (Phase 2 & 3: /api/v1/auth/*).
 *
 * Note: exact response shapes will be regenerated from the OpenAPI schema in a
 * follow-up commit; these interfaces mirror the DTOs in
 * com.meicrypt.identity.auth.dto.
 */

/**
 * Frontend-facing login shape. The SPA passes an org slug for UX; the
 * client transparently resolves it to the backend's required UUID.
 */
export type LoginRequest = {
  email: string;
  password: string;
  /** Required organization slug for multi-tenant login. */
  orgSlug: string;
  /** Set by the browser at request time. */
  deviceFingerprint?: string;
  deviceName?: string;
};

/**
 * Normalised login response shape used by the SPA. The backend's raw shape
 * is {tokens: {accessToken, refreshToken, expiresIn, ...}, mfaChallenge} —
 * we flatten it in `authApi.login` so callers keep the ergonomic top-level
 * fields the UI already expects.
 */
export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  mfaRequired?: boolean;
  mfaChallengeId?: string;
  /**
   * Opaque token issued alongside `mfaChallengeId`. This is the value the
   * backend actually wants back in the verify request — the id is only for
   * display/debug purposes.
   */
  mfaChallengeToken?: string;
  orgSlug?: string;
  organizationId?: string;
  user?: {
    id: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    membershipId?: string;
  };
};

/** Raw backend response for /api/v1/auth/login. */
type BackendLoginResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: "Bearer";
    expiresIn: number;
    sessionId: string;
    userId: string;
  } | null;
  mfaChallenge: {
    challengeId: string;
    challengeToken: string;
    allowedFactorTypes?: string[];
    expiresAt: string;
  } | null;
};

/**
 * Backend contract: /api/v1/users/register expects an organizationId (UUID),
 * not a slug. The frontend resolves slug → id via /api/v1/organizations/slug/{slug}
 * before calling this endpoint.
 */
export type RegisterRequest = {
  organizationId: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  locale?: string;
  timezone?: string;
};

/**
 * Backend actually returns the full UserDTO on register (201).
 * We normalize it to a smaller shape on the client.
 */
export type RegisterResponse = {
  id: string;
  email: string;
  emailVerified: boolean;
  organizationId: string;
};

export type ForgotPasswordRequest = {
  email: string;
  orgSlug?: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type VerifyEmailRequest = {
  token: string;
};

export type MfaVerifyRequest = {
  /** Opaque token returned inside `mfaChallenge` from /auth/login. */
  challengeToken: string;
  /** 6–10 digit TOTP code (WebAuthn is handled separately). */
  code: string;
  /** Reserved for future factor types; defaults to TOTP. */
  factorType?: "TOTP" | "WEBAUTHN";
  /** Passed through to the login response for UI hydration. */
  orgSlug?: string;
  organizationId?: string;
};

export const authApi = {
  /**
   * Two-step login: resolve org slug → UUID, then POST /auth/login.
   * Also flattens the backend's {tokens, mfaChallenge} envelope into the
   * top-level shape the SPA components expect.
   */
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const orgResponse = await api.get<{ id: string }>(
      `/api/v1/organizations/slug/${encodeURIComponent(payload.orgSlug)}`,
    );
    const organizationId = orgResponse.data.id;

    const raw = await api
      .post<BackendLoginResponse>("/api/v1/auth/login", {
        organizationId,
        email: payload.email,
        password: payload.password,
        deviceFingerprint: payload.deviceFingerprint,
        deviceName: payload.deviceName,
      })
      .then((r) => r.data);

    if (raw.mfaChallenge) {
      return {
        accessToken: "",
        tokenType: "Bearer",
        expiresIn: 0,
        mfaRequired: true,
        mfaChallengeId: raw.mfaChallenge.challengeId,
        mfaChallengeToken: raw.mfaChallenge.challengeToken,
        orgSlug: payload.orgSlug,
        organizationId,
      };
    }

    if (!raw.tokens) {
      throw new Error("Login response contained neither tokens nor mfaChallenge");
    }

    // The lightweight /auth/login response doesn't include the full user
    // profile; hydrate it with a follow-up /auth/me call so the SPA has
    // display name + emailVerified for immediate UI.
    let profile: LoginResponse["user"] | undefined;
    try {
      const me = await api.get<{
        userId: string;
        email: string;
        displayName?: string;
        emailVerified?: boolean;
      }>("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${raw.tokens.accessToken}` },
      });
      profile = {
        id: me.data.userId,
        email: me.data.email,
        displayName: me.data.displayName ?? me.data.email,
        emailVerified: me.data.emailVerified ?? true,
      };
    } catch {
      // /me is optional for hydration; UI will fall back to email.
      profile = {
        id: raw.tokens.userId,
        email: payload.email,
        displayName: payload.email,
        emailVerified: true,
      };
    }

    return {
      accessToken: raw.tokens.accessToken,
      tokenType: "Bearer",
      expiresIn: raw.tokens.expiresIn,
      orgSlug: payload.orgSlug,
      organizationId,
      user: profile,
    };
  },

  logout: () => api.post<void>("/api/v1/auth/logout").then((r) => r.data),

  /**
   * Two-step register: resolve org slug → UUID, then POST /users/register.
   * Backend validates: organizationId (UUID), email, password (8–100 chars).
   */
  register: async (params: {
    orgSlug: string;
    email: string;
    password: string;
    displayName?: string;
  }) => {
    const orgResponse = await api.get<{ id: string }>(
      `/api/v1/organizations/slug/${encodeURIComponent(params.orgSlug)}`,
    );
    const nameParts = (params.displayName ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] || undefined;
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const body: RegisterRequest = {
      organizationId: orgResponse.data.id,
      email: params.email,
      password: params.password,
      firstName,
      lastName,
    };
    const registerResponse = await api.post<RegisterResponse>(
      "/api/v1/users/register",
      body,
    );
    return registerResponse.data;
  },

  forgotPassword: (payload: ForgotPasswordRequest) =>
    api
      .post<void>("/api/v1/auth/forgot-password", payload)
      .then((r) => r.data),

  resetPassword: (payload: ResetPasswordRequest) =>
    api
      .post<void>("/api/v1/auth/reset-password", payload)
      .then((r) => r.data),

  verifyEmail: (payload: VerifyEmailRequest) =>
    api
      .post<void>("/api/v1/verification/verify-email", payload)
      .then((r) => r.data),

  /**
   * Redeem an MFA challenge token for real tokens. Backend contract:
   *   POST /api/v1/mfa/challenges/verify
   *   body: { challengeToken, factorType, proof }
   *   200 : TokenResponse  (raw — no user profile)
   *
   * We flatten the response into the same `LoginResponse` shape the rest of
   * the SPA already consumes, and hydrate the user profile via /auth/me.
   */
  mfaVerify: async (payload: MfaVerifyRequest): Promise<LoginResponse> => {
    const tokens = await api
      .post<{
        accessToken: string;
        refreshToken: string;
        tokenType: "Bearer";
        expiresIn: number;
        sessionId: string;
        userId: string;
      }>("/api/v1/mfa/challenges/verify", {
        challengeToken: payload.challengeToken,
        factorType: payload.factorType ?? "TOTP",
        proof: payload.code,
      })
      .then((r) => r.data);

    let profile: LoginResponse["user"];
    try {
      const me = await api.get<{
        userId: string;
        email: string;
        displayName?: string;
        emailVerified?: boolean;
      }>("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      profile = {
        id: me.data.userId,
        email: me.data.email,
        displayName: me.data.displayName ?? me.data.email,
        emailVerified: me.data.emailVerified ?? true,
      };
    } catch {
      profile = {
        id: tokens.userId,
        email: "",
        displayName: "",
        emailVerified: true,
      };
    }

    return {
      accessToken: tokens.accessToken,
      tokenType: "Bearer",
      expiresIn: tokens.expiresIn,
      orgSlug: payload.orgSlug,
      organizationId: payload.organizationId,
      user: profile,
    };
  },
};
