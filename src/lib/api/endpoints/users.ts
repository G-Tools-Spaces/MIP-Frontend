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

/**
 * A user row enriched with the membership role/status they hold in the
 * currently-selected organization. Returned by
 * {@link usersApi.listByOrganization} which stitches the caller-side
 * fan-out described below.
 */
export type OrgMember = User & {
  membershipId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
  membershipStatus: "ACTIVE" | "PENDING" | "SUSPENDED" | "REVOKED";
  joinedAt?: string;
};

type MembershipRow = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgMember["role"];
  status: OrgMember["membershipStatus"];
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Fetch a users' organization membership listing and hydrate each row
 * with the underlying user profile. Since V18 the {@code users} table no
 * longer carries {@code organization_id}, so the legacy
 * {@code /users/organization/{id}} endpoint returns an empty list for any
 * org whose users all self-registered / joined via invitation.
 *
 * We therefore drive the list off {@code organization_memberships}
 * (source of truth for "who belongs to this org") and enrich each row
 * via {@code /users/{userId}}. The fan-out is bounded by the number of
 * members in the org — well under any pagination boundary today — and
 * runs in parallel.
 */
const listByOrganizationViaMemberships = async (
  organizationId: string,
): Promise<OrgMember[]> => {
  const memberships = await api
    .get<MembershipRow[]>(
      `/api/v1/organizations/memberships/organization/${organizationId}`,
    )
    .then((r) => r.data);

  const users = await Promise.all(
    memberships.map((m) =>
      api
        .get<User>(`/api/v1/users/${m.userId}`)
        .then((r) => r.data)
        // Users that were hard-deleted but whose membership row lingers
        // shouldn't break the whole page — skip them by returning null.
        .catch(() => null as unknown as User | null),
    ),
  );

  const rows: OrgMember[] = [];
  memberships.forEach((m, i) => {
    const u = users[i];
    if (!u) return;
    rows.push({
      ...u,
      membershipId: m.id,
      role: m.role,
      membershipStatus: m.status,
      joinedAt: m.joinedAt,
    });
  });
  return rows;
};

export const usersApi = {
  byId: (userId: string) =>
    api.get<User>(`/api/v1/users/${userId}`).then((r) => r.data),

  listByOrganization: (organizationId: string) =>
    listByOrganizationViaMemberships(organizationId),

  listActiveByOrganization: async (organizationId: string) => {
    const rows = await listByOrganizationViaMemberships(organizationId);
    return rows.filter(
      (r) => r.membershipStatus === "ACTIVE" && r.status === "ACTIVE",
    );
  },

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
