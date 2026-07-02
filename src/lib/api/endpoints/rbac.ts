"use client";

import { api } from "@/lib/api/client";

/** RBAC (roles + permissions + assignments) — Phase 4 in the backend. */

export type Permission = {
  id: string;
  code: string;
  domain: string;
  resource: string;
  action: string;
  description?: string;
  system: boolean;
};

export type Role = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  defaultRole: boolean;
  system: boolean;
  permissionCodes: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateRoleRequest = {
  name: string;
  slug?: string;
  description?: string;
  defaultRole?: boolean;
  permissionCodes: string[];
};

export type UpdateRoleRequest = Partial<CreateRoleRequest>;

export type RoleAssignment = {
  id: string;
  membershipId: string;
  roleId: string;
  roleName: string;
  assignedAt: string;
  assignedBy?: string;
};

export const rbacApi = {
  listPermissions: (domain?: string) =>
    api
      .get<Permission[]>("/api/v1/rbac/permissions", {
        params: domain ? { domain } : undefined,
      })
      .then((r) => r.data),

  listRoles: (organizationId: string) =>
    api
      .get<Role[]>(`/api/v1/organizations/${organizationId}/roles`)
      .then((r) => r.data),

  getRole: (organizationId: string, roleId: string) =>
    api
      .get<Role>(`/api/v1/organizations/${organizationId}/roles/${roleId}`)
      .then((r) => r.data),

  createRole: (organizationId: string, payload: CreateRoleRequest) =>
    api
      .post<Role>(`/api/v1/organizations/${organizationId}/roles`, payload)
      .then((r) => r.data),

  updateRole: (
    organizationId: string,
    roleId: string,
    payload: UpdateRoleRequest,
  ) =>
    api
      .patch<Role>(
        `/api/v1/organizations/${organizationId}/roles/${roleId}`,
        payload,
      )
      .then((r) => r.data),

  deleteRole: (organizationId: string, roleId: string) =>
    api
      .delete<void>(`/api/v1/organizations/${organizationId}/roles/${roleId}`)
      .then((r) => r.data),

  listAssignments: (organizationId: string, membershipId: string) =>
    api
      .get<RoleAssignment[]>(
        `/api/v1/organizations/${organizationId}/memberships/${membershipId}/role-assignments`,
      )
      .then((r) => r.data),

  assignRole: (
    organizationId: string,
    membershipId: string,
    roleId: string,
  ) =>
    api
      .post<RoleAssignment>(
        `/api/v1/organizations/${organizationId}/memberships/${membershipId}/role-assignments`,
        { roleId },
      )
      .then((r) => r.data),

  removeAssignment: (
    organizationId: string,
    membershipId: string,
    assignmentId: string,
  ) =>
    api
      .delete<void>(
        `/api/v1/organizations/${organizationId}/memberships/${membershipId}/role-assignments/${assignmentId}`,
      )
      .then((r) => r.data),
};

/** Hardcoded permission codes discovered in the backend. */
export const KNOWN_PERMISSIONS: readonly string[] = [
  "audit:log:read",
  "identity:session:read",
  "identity:session:revoke",
  "identity:user:read",
  "identity:user:suspend",
  "identity:user:update",
  "oauth:application:manage",
  "oauth:application:read",
  "organization:domain:manage",
  "organization:domain:read",
  "organization:invitation:manage",
  "organization:invitation:read",
  "organization:membership:manage",
  "organization:membership:read",
  "organization:organization:read",
  "organization:organization:update",
  "rbac:assignment:manage",
  "rbac:assignment:read",
  "rbac:permission:read",
  "rbac:role:manage",
  "rbac:role:read",
] as const;
