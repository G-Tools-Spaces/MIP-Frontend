"use client";

import { api } from "@/lib/api/client";

export type OrganizationSettings = {
  organizationId: string;
  brandName?: string;
  brandLogoUrl?: string;
  primaryTimezone?: string;
  primaryLanguage?: string;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  maxSessionDurationMinutes: number;
  updatedAt: string;
};

export type UpdateSettingsRequest = Partial<
  Omit<OrganizationSettings, "organizationId" | "updatedAt">
>;

export const settingsApi = {
  get: (organizationId: string) =>
    api
      .get<OrganizationSettings>(
        `/api/v1/organizations/${organizationId}/settings`,
      )
      .then((r) => r.data),

  update: (organizationId: string, payload: UpdateSettingsRequest) =>
    api
      .put<OrganizationSettings>(
        `/api/v1/organizations/${organizationId}/settings`,
        payload,
      )
      .then((r) => r.data),

  reset: (organizationId: string) =>
    api
      .post<OrganizationSettings>(
        `/api/v1/organizations/${organizationId}/settings/reset`,
      )
      .then((r) => r.data),
};
