"use client";

import { api } from "@/lib/api/client";

export type ApplicationType = "WEB" | "SPA" | "MOBILE" | "SERVICE" | "NATIVE";
export type ApplicationStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

/**
 * Shape mirrors backend {@code ClientApplicationDTO}. Field names must
 * match the JSON keys exactly — {@code applicationType}, {@code
 * postLogoutRedirectUris}, {@code confidential} (not {@code isPublic}) etc.
 */
export type ClientApplication = {
  id: string;
  organizationId: string;
  clientId: string;
  name: string;
  slug: string;
  description?: string;
  applicationType: ApplicationType;
  status: ApplicationStatus;
  confidential: boolean;
  hasClientSecret: boolean;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  grantTypes: string[];
  scopes: string[];
  requirePkce: boolean;
  requireConsent: boolean;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  logoUrl?: string;
  homepageUrl?: string;
  backchannelLogoutUri?: string;
  clientSecretLastRotatedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
};

export type ClientApplicationCredentials = {
  clientId: string;
  clientSecret: string; // only returned once, at creation / rotation
};

/**
 * Payload for POST /organizations/{id}/applications.
 *
 * IMPORTANT: field names must match the backend
 * {@code CreateClientApplicationRequest} record exactly:
 *   - {@code applicationType} (NOT {@code type})
 *   - {@code postLogoutRedirectUris} (NOT {@code logoutUris})
 * Sending {@code type} produced HTTP 400
 * "Field error … 'applicationType': rejected value [null]".
 */
export type CreateApplicationRequest = {
  name: string;
  slug?: string;
  description?: string;
  applicationType: ApplicationType;
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  grantTypes?: string[];
  scopes?: string[];
  requirePkce?: boolean;
  requireConsent?: boolean;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
  logoUrl?: string;
  homepageUrl?: string;
  backchannelLogoutUri?: string;
};

export type UpdateApplicationRequest = Partial<CreateApplicationRequest>;

export const applicationsApi = {
  list: (organizationId: string) =>
    api
      .get<ClientApplication[]>(
        `/api/v1/organizations/${organizationId}/applications`,
      )
      .then((r) => r.data),

  get: (organizationId: string, applicationId: string) =>
    api
      .get<ClientApplication>(
        `/api/v1/organizations/${organizationId}/applications/${applicationId}`,
      )
      .then((r) => r.data),

  create: (organizationId: string, payload: CreateApplicationRequest) =>
    api
      .post<{
        application: ClientApplication;
        credentials: ClientApplicationCredentials;
      }>(`/api/v1/organizations/${organizationId}/applications`, payload)
      .then((r) => r.data),

  update: (
    organizationId: string,
    applicationId: string,
    payload: UpdateApplicationRequest,
  ) =>
    api
      .patch<ClientApplication>(
        `/api/v1/organizations/${organizationId}/applications/${applicationId}`,
        payload,
      )
      .then((r) => r.data),

  updateStatus: (
    organizationId: string,
    applicationId: string,
    status: ApplicationStatus,
  ) =>
    api
      .put<ClientApplication>(
        `/api/v1/organizations/${organizationId}/applications/${applicationId}/status`,
        { status },
      )
      .then((r) => r.data),

  rotateSecret: (organizationId: string, applicationId: string) =>
    api
      .post<ClientApplicationCredentials>(
        `/api/v1/organizations/${organizationId}/applications/${applicationId}/rotate-secret`,
      )
      .then((r) => r.data),

  delete: (organizationId: string, applicationId: string) =>
    api
      .delete<void>(
        `/api/v1/organizations/${organizationId}/applications/${applicationId}`,
      )
      .then((r) => r.data),
};
