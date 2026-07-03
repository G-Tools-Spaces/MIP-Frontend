"use client";

import { api } from "@/lib/api/client";

/**
 * Invitation client.
 *
 * Backend contract (see `OrganizationInvitationController`):
 *   POST   /api/v1/organizations/invitations
 *   POST   /api/v1/organizations/invitations/accept
 *   GET    /api/v1/organizations/invitations/{invitationId}
 *   GET    /api/v1/organizations/invitations/organization/{organizationId}
 *   GET    /api/v1/organizations/invitations/organization/{organizationId}/pending
 *   GET    /api/v1/organizations/invitations/email/{email}
 *   DELETE /api/v1/organizations/invitations/{invitationId}
 *
 * Payload uses the *legacy MembershipRole enum* {OWNER, ADMIN, MEMBER, GUEST}
 * — this is a controller-level enum on the backend, not an RBAC roleId. When
 * we migrate to fine-grained RBAC roles at the invitation layer, this DTO
 * gains a `roleId` field.
 */

export type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED";

export type MembershipRoleName = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

/** UI-facing shape adapted from backend {@code OrganizationInvitationDTO}. */
export type Invitation = {
  id: string;
  organizationId: string;
  email: string;
  role: MembershipRoleName;
  status: InvitationStatus;
  invitedByUserId?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type CreateInvitationRequest = {
  organizationId: string;
  email: string;
  role: MembershipRoleName;
  /** Optional — server infers from the authenticated principal if omitted. */
  invitedByUserId?: string;
};

export type AcceptInvitationRequest = {
  /** Invitation token issued in the invite email. */
  token: string;
  userId: string;
};

export const invitationsApi = {
  /**
   * List every invitation for an organization.
   * Nested under {@code /invitations/organization/{orgId}} on the backend.
   */
  list: (organizationId: string) =>
    api
      .get<Invitation[]>(
        `/api/v1/organizations/invitations/organization/${organizationId}`,
      )
      .then((r) => r.data),

  listPending: (organizationId: string) =>
    api
      .get<Invitation[]>(
        `/api/v1/organizations/invitations/organization/${organizationId}/pending`,
      )
      .then((r) => r.data),

  byId: (invitationId: string) =>
    api
      .get<Invitation>(`/api/v1/organizations/invitations/${invitationId}`)
      .then((r) => r.data),

  byEmail: (email: string) =>
    api
      .get<Invitation[]>(
        `/api/v1/organizations/invitations/email/${encodeURIComponent(email)}`,
      )
      .then((r) => r.data),

  create: (payload: CreateInvitationRequest) =>
    api
      .post<Invitation>("/api/v1/organizations/invitations", payload)
      .then((r) => r.data),

  accept: (payload: AcceptInvitationRequest) =>
    api
      .post<Invitation>("/api/v1/organizations/invitations/accept", payload)
      .then((r) => r.data),

  revoke: (invitationId: string) =>
    api
      .delete<void>(`/api/v1/organizations/invitations/${invitationId}`)
      .then((r) => r.data),
};
