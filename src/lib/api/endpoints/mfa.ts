"use client";

import { api } from "@/lib/api/client";

/**
 * MFA (multi-factor auth) client.
 *
 * Wire-compatible with:
 *   com.meicrypt.identity.mfa.controller.MfaFactorController    (list)
 *   com.meicrypt.identity.mfa.controller.TotpController         (TOTP enroll/verify/revoke)
 *   com.meicrypt.identity.mfa.controller.WebAuthnController     (passkey register/revoke)
 *   com.meicrypt.identity.mfa.controller.MfaChallengeController (step-up verify)
 */

export type MfaFactorType = "TOTP" | "WEBAUTHN" | "SMS" | "EMAIL";
export type MfaFactorStatus = "ACTIVE" | "PENDING" | "DISABLED";

export type MfaFactor = {
  id: string;
  type: MfaFactorType;
  status: MfaFactorStatus;
  label?: string;
  createdAt: string;
  lastUsedAt?: string;
};

/**
 * Raw backend enrollment response (see mfa.dto.TotpEnrollmentResponse).
 * We adapt it in `enrollTotp` to a UI-friendly shape.
 */
type BackendTotpEnrollmentResponse = {
  factorId: string;
  secretBase32: string;
  otpAuthUri: string;
  qrCodePngBase64: string;
  digits: number;
  periodSeconds: number;
  algorithm: string;
};

/** UI-facing enrollment shape (kept stable across backend renames). */
export type TotpEnrollmentResponse = {
  factorId: string;
  secret: string;
  otpauthUri: string;
  qrCodeDataUri: string;
  /** Backend doesn't return recovery codes yet; always [] for now. */
  recoveryCodes: string[];
};

export type TotpVerifyRequest = { factorId: string; code: string };

export type WebauthnRegistrationOptions = {
  challenge: string;
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: "public-key"; alg: number }>;
  timeout?: number;
  attestation?: "none" | "indirect" | "direct";
  authenticatorSelection?: {
    residentKey?: "required" | "preferred" | "discouraged";
    userVerification?: "required" | "preferred" | "discouraged";
  };
  /** Backend piggy-backs the pending factorId here so the client can complete
   * registration without an extra round-trip. */
  factorId?: string;
};

export const mfaApi = {
  listFactors: () =>
    api.get<MfaFactor[]>("/api/v1/mfa/factors").then((r) => r.data),

  /**
   * Begin TOTP enrolment. The backend requires a `displayName` in the body;
   * we default it here so the caller can stay a no-arg for a smooth UX.
   */
  enrollTotp: async (
    displayName: string = "Authenticator app",
  ): Promise<TotpEnrollmentResponse> => {
    const res = await api
      .post<BackendTotpEnrollmentResponse>("/api/v1/mfa/totp/enroll", {
        displayName,
      })
      .then((r) => r.data);
    return {
      factorId: res.factorId,
      secret: res.secretBase32,
      otpauthUri: res.otpAuthUri,
      qrCodeDataUri: res.qrCodePngBase64.startsWith("data:")
        ? res.qrCodePngBase64
        : `data:image/png;base64,${res.qrCodePngBase64}`,
      recoveryCodes: [],
    };
  },

  /**
   * Confirm the TOTP enrolment. Backend path is
   *   POST /api/v1/mfa/totp/factors/{factorId}/verify   body: {code}
   */
  verifyTotp: (payload: TotpVerifyRequest) =>
    api
      .post<{ message: string }>(
        `/api/v1/mfa/totp/factors/${encodeURIComponent(payload.factorId)}/verify`,
        { code: payload.code },
      )
      .then((r) => r.data),

  /**
   * Disable a factor. The backend splits revocation by factor type — we
   * infer the correct path from the caller (default to TOTP for legacy
   * callers). Use `disableTotp` / `disableWebauthn` for explicit control.
   */
  disableFactor: (factorId: string) =>
    api
      .delete<{ message: string }>(
        `/api/v1/mfa/totp/factors/${encodeURIComponent(factorId)}`,
      )
      .then((r) => r.data),

  disableTotp: (factorId: string) =>
    api
      .delete<{ message: string }>(
        `/api/v1/mfa/totp/factors/${encodeURIComponent(factorId)}`,
      )
      .then((r) => r.data),

  disableWebauthn: (factorId: string) =>
    api
      .delete<{ message: string }>(
        `/api/v1/mfa/webauthn/factors/${encodeURIComponent(factorId)}`,
      )
      .then((r) => r.data),

  /**
   * Begin WebAuthn registration. Backend path is `/register/begin` (not
   * `/register/start`) and requires `{displayName}` in the body.
   */
  webauthnRegisterStart: (displayName: string = "Passkey") =>
    api
      .post<WebauthnRegistrationOptions>("/api/v1/mfa/webauthn/register/begin", {
        displayName,
      })
      .then((r) => r.data),

  webauthnRegisterFinish: (payload: {
    factorId: string;
    credentialId: string;
    clientDataJsonBase64: string;
    attestationObjectBase64: string;
    transports?: string[];
  }) =>
    api
      .post<{ message: string }>(
        "/api/v1/mfa/webauthn/register/complete",
        payload,
      )
      .then((r) => r.data),
};
