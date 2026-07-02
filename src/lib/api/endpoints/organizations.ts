"use client";

import { api } from "@/lib/api/client";

/**
 * Organization endpoints — mirror `/api/v1/organizations` from the MIP backend.
 * These types follow OrganizationDTO / OrganizationMembershipDTO on the server.
 */

export type OrganizationStatus = "ACTIVE" | "SUSPENDED";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export const organizationsApi = {
  list: () =>
    api.get<Organization[]>("/api/v1/organizations").then((r) => r.data),

  bySlug: (slug: string) =>
    api
      .get<Organization>(`/api/v1/organizations/slug/${slug}`)
      .then((r) => r.data),

  byId: (id: string) =>
    api.get<Organization>(`/api/v1/organizations/${id}`).then((r) => r.data),

  countMembers: (organizationId: string) =>
    api
      .get<number>(
        `/api/v1/organizations/memberships/organization/${organizationId}/count`,
      )
      .then((r) => r.data),

  membershipsForUser: (userId: string) =>
    api
      .get<OrganizationMembership[]>(
        `/api/v1/organizations/memberships/user/${userId}`,
      )
      .then((r) => r.data),
};
