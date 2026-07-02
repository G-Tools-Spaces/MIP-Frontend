"use client";

import { api } from "@/lib/api/client";
import type { OrganizationStatus } from "./organizations";

export type PlatformStats = {
  organizationCount: number;
  activeOrganizationCount: number;
  userCount: number;
  activeSessionCount: number;
  pendingNotifications: number;
  clientApplicationCount: number;
};

export type PlatformOrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  userCount: number;
  activeSessionCount: number;
  createdAt: string;
};

export const platformApi = {
  stats: () =>
    api.get<PlatformStats>("/api/v1/admin/stats").then((r) => r.data),

  organizations: () =>
    api
      .get<PlatformOrganizationSummary[]>("/api/v1/admin/organizations")
      .then((r) => r.data),

  updateOrganizationStatus: (
    organizationId: string,
    status: OrganizationStatus,
    reason?: string,
  ) =>
    api
      .put<PlatformOrganizationSummary>(
        `/api/v1/admin/organizations/${organizationId}/status`,
        { status, reason },
      )
      .then((r) => r.data),
};
