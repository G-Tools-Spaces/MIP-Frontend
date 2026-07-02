"use client";

import { api } from "@/lib/api/client";

/**
 * User endpoints — mirror `/api/v1/users` on the MIP backend.
 */

export type UserStatus =
  | "ACTIVE"
  | "PENDING_VERIFICATION"
  | "SUSPENDED"
  | "DEACTIVATED";

export type User = {
  id: string;
  organizationId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  displayName: string;
  profilePictureUrl?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  locale?: string;
  timezone?: string;
  status: UserStatus;
  lastLoginAt?: string;
  lastLoginIp?: string;
  passwordChangedAt?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
};

export const usersApi = {
  byId: (userId: string) =>
    api.get<User>(`/api/v1/users/${userId}`).then((r) => r.data),

  listByOrganization: (organizationId: string) =>
    api
      .get<User[]>(`/api/v1/users/organization/${organizationId}`)
      .then((r) => r.data),

  listActiveByOrganization: (organizationId: string) =>
    api
      .get<User[]>(`/api/v1/users/organization/${organizationId}/active`)
      .then((r) => r.data),

  countByOrganization: (organizationId: string) =>
    api
      .get<{ count: number }>(
        `/api/v1/users/organization/${organizationId}/count`,
      )
      .then((r) => r.data.count),

  countActiveByOrganization: (organizationId: string) =>
    api
      .get<{ count: number }>(
        `/api/v1/users/organization/${organizationId}/count/active`,
      )
      .then((r) => r.data.count),

  suspend: (userId: string) =>
    api.put<User>(`/api/v1/users/${userId}/suspend`).then((r) => r.data),

  activate: (userId: string) =>
    api.put<User>(`/api/v1/users/${userId}/activate`).then((r) => r.data),

  deactivate: (userId: string) =>
    api.put<User>(`/api/v1/users/${userId}/deactivate`).then((r) => r.data),
};
