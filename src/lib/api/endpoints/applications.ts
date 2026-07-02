"use client";

import { api } from "@/lib/api/client";

export type ApplicationType = "WEB" | "SPA" | "MOBILE" | "SERVICE" | "NATIVE";
export type ApplicationStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

export type ClientApplication = {
  id: string;
  organizationId: string;
  clientId: string;
  name: string;
  description?: string;
  type: ApplicationType;
  status: ApplicationStatus;
  isPublic: boolean;
  redirectUris: string[];
  logoutUris: string[];
  scopes: string[];
  logoUrl?: string;
  homepageUrl?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientApplicationCredentials = {
  clientId: string;
  clientSecret: string; // only returned once, at creation / rotation
};

export type CreateApplicationRequest = {
  name: string;
  description?: string;
  type: ApplicationType;
  isPublic?: boolean;
  redirectUris?: string[];
  logoutUris?: string[];
  scopes?: string[];
  logoUrl?: string;
  homepageUrl?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
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
