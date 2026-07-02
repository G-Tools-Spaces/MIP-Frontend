"use client";

import { api } from "@/lib/api/client";

export type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED";

export type Invitation = {
  id: string;
  organizationId: string;
  email: string;
  roleId?: string;
  roleName?: string;
  status: InvitationStatus;
  expiresAt: string;
  invitedBy?: string;
  acceptedAt?: string;
  createdAt: string;
};

export type CreateInvitationRequest = {
  email: string;
  roleId?: string;
  expiresInHours?: number;
};

export const invitationsApi = {
  list: (organizationId: string) =>
    api
      .get<Invitation[]>(
        `/api/v1/organizations/${organizationId}/invitations`,
      )
      .then((r) => r.data),

  create: (organizationId: string, payload: CreateInvitationRequest) =>
    api
      .post<Invitation>(
        `/api/v1/organizations/${organizationId}/invitations`,
        payload,
      )
      .then((r) => r.data),

  revoke: (organizationId: string, invitationId: string) =>
    api
      .delete<void>(
        `/api/v1/organizations/${organizationId}/invitations/${invitationId}`,
      )
      .then((r) => r.data),

  resend: (organizationId: string, invitationId: string) =>
    api
      .post<Invitation>(
        `/api/v1/organizations/${organizationId}/invitations/${invitationId}/resend`,
      )
      .then((r) => r.data),
};
