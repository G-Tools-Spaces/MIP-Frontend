"use client";

import { api } from "@/lib/api/client";

/**
 * Onboarding endpoints — thin wrappers over the Spring backend's
 * `/api/v1/onboarding/*` and `/api/v1/platform-admin/*` routes. See
 * ONBOARDING_FLOW.md at the repo root for the end-to-end sequence.
 *
 * Everything in this file is UI-facing; the shapes intentionally mirror
 * `com.meicrypt.identity.onboarding.dto` on the backend.
 */

// ─── Step 0 — Identity lookup ─────────────────────────────────────────────

export type IdentityLookupRequest =
  | { email: string }
  | { phoneE164: string };

export type IdentityLookupResponse = {
  exists: boolean;
  nextStep: "REGISTER" | "LOGIN";
};

// ─── Step 1 — Phone-OTP registration (start) ──────────────────────────────

export type StartRegistrationRequest = {
  firstName: string;
  lastName: string;
  email: string;
  phoneE164: string;
  password: string;
};

export type StartRegistrationResponse = {
  verificationId: string;
  phoneE164: string;
  expiresAt: string;
  maxAttempts: number;
};

// ─── Step 2 — OTP verification ────────────────────────────────────────────

export type VerifyRegistrationOtpRequest = {
  verificationId: string;
  code: string;
};

export type VerifyRegistrationOtpResponse = {
  userId: string;
  email: string;
  phoneE164: string;
  nextAction: "CHOOSE_ONBOARDING_PATH";
};

// ─── Flow 1 — Join an existing business ───────────────────────────────────

export type ResolvedOrganizationDTO = {
  organizationId: string;
  name: string;
  slug: string;
};

export type CreateJoinRequestRequest = {
  colleagueEmail: string;
  message?: string;
};

export type JoinRequestDTO = {
  id: string;
  userId: string;
  organizationId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  message: string | null;
  requestedAt: string;
  decidedAt: string | null;
  decidedByUserId: string | null;
  decisionReason: string | null;
};

// ─── Flow 2 — Setup your business ─────────────────────────────────────────

export type InitialInvitee = {
  email: string;
  role?: "ADMIN" | "MEMBER" | "GUEST";
};

export type SubmitOrgCreationRequest = {
  name: string;
  slug: string;
  businessEmail?: string;
  businessPhone?: string;
  businessWebsite?: string;
  businessSize?: string;
  businessIndustry?: string;
  businessCountry?: string; // ISO 3166-1 alpha-2
  justification?: string;
  invitees?: InitialInvitee[];
};

export type OrgCreationRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type OrgCreationRequestDTO = {
  id: string;
  requesterUserId: string;
  proposedName: string;
  proposedSlug: string;
  businessEmail: string | null;
  businessPhone: string | null;
  businessWebsite: string | null;
  businessSize: string | null;
  businessIndustry: string | null;
  businessCountry: string | null;
  justification: string | null;
  status: OrgCreationRequestStatus;
  createdOrganizationId: string | null;
  submittedAt: string;
  decidedAt: string | null;
  decidedByUserId: string | null;
  decisionReason: string | null;
  invitees: Array<{
    id: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
    materialisedInvitationId: string | null;
  }>;
};

// ─── My memberships (post-login routing) ──────────────────────────────────

export type MyMembershipDTO = {
  membershipId: string;
  organizationId: string;
  organizationName: string | null;
  organizationSlug: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";
};

export const onboardingApi = {
  identityLookup: (payload: IdentityLookupRequest) =>
    api
      .post<IdentityLookupResponse>("/api/v1/onboarding/identity-lookup", payload)
      .then((r) => r.data),

  /**
   * Return the caller's organization memberships. The SPA uses this
   * immediately after login to decide whether to route to the console
   * dashboard (has ≥1 ACTIVE membership) or into onboarding (zero
   * memberships → prompt to join or create).
   */
  myMemberships: () =>
    api
      .get<MyMembershipDTO[]>("/api/v1/onboarding/me/memberships")
      .then((r) => r.data),

  startRegistration: (payload: StartRegistrationRequest) =>
    api
      .post<StartRegistrationResponse>(
        "/api/v1/onboarding/register/start",
        payload,
      )
      .then((r) => r.data),

  verifyRegistrationOtp: (payload: VerifyRegistrationOtpRequest) =>
    api
      .post<VerifyRegistrationOtpResponse>(
        "/api/v1/onboarding/register/verify",
        payload,
      )
      .then((r) => r.data),

  // ── Flow 1 ─────────────────────────────────────────────────────────────
  previewJoinTarget: (colleagueEmail: string) =>
    api
      .get<ResolvedOrganizationDTO>(
        `/api/v1/onboarding/join-requests/preview`,
        { params: { colleagueEmail } },
      )
      .then((r) => r.data),

  createJoinRequest: (payload: CreateJoinRequestRequest) =>
    api
      .post<JoinRequestDTO>("/api/v1/onboarding/join-requests", payload)
      .then((r) => r.data),

  listMyJoinRequests: () =>
    api
      .get<JoinRequestDTO[]>("/api/v1/onboarding/join-requests/mine")
      .then((r) => r.data),

  listPendingJoinRequests: (organizationId: string) =>
    api
      .get<JoinRequestDTO[]>("/api/v1/onboarding/join-requests/pending", {
        params: { organizationId },
      })
      .then((r) => r.data),

  approveJoinRequest: (id: string, reason?: string) =>
    api
      .post<JoinRequestDTO>(
        `/api/v1/onboarding/join-requests/${id}/approve`,
        reason ? { reason } : {},
      )
      .then((r) => r.data),

  rejectJoinRequest: (id: string, reason?: string) =>
    api
      .post<JoinRequestDTO>(
        `/api/v1/onboarding/join-requests/${id}/reject`,
        reason ? { reason } : {},
      )
      .then((r) => r.data),

  // ── Flow 2 ─────────────────────────────────────────────────────────────
  submitOrgCreationRequest: (payload: SubmitOrgCreationRequest) =>
    api
      .post<OrgCreationRequestDTO>(
        "/api/v1/onboarding/org-creation-requests",
        payload,
      )
      .then((r) => r.data),

  listMyOrgCreationRequests: () =>
    api
      .get<OrgCreationRequestDTO[]>(
        "/api/v1/onboarding/org-creation-requests/mine",
      )
      .then((r) => r.data),

  getOrgCreationRequest: (id: string) =>
    api
      .get<OrgCreationRequestDTO>(
        `/api/v1/onboarding/org-creation-requests/${id}`,
      )
      .then((r) => r.data),

  cancelOrgCreationRequest: (id: string) =>
    api
      .post<OrgCreationRequestDTO>(
        `/api/v1/onboarding/org-creation-requests/${id}/cancel`,
      )
      .then((r) => r.data),

  // ── Platform admin queue (Global Admin only) ────────────────────────────
  listOrgCreationQueue: (params: {
    status?: OrgCreationRequestStatus;
    page?: number;
    size?: number;
  }) =>
    api
      .get<{
        content: OrgCreationRequestDTO[];
        totalElements: number;
        totalPages: number;
        number: number;
        size: number;
      }>("/api/v1/platform-admin/org-creation-requests", { params })
      .then((r) => r.data),

  approveOrgCreationRequest: (id: string) =>
    api
      .post<OrgCreationRequestDTO>(
        `/api/v1/platform-admin/org-creation-requests/${id}/approve`,
      )
      .then((r) => r.data),

  rejectOrgCreationRequest: (id: string, reason?: string) =>
    api
      .post<OrgCreationRequestDTO>(
        `/api/v1/platform-admin/org-creation-requests/${id}/reject`,
        reason ? { reason } : {},
      )
      .then((r) => r.data),
};
