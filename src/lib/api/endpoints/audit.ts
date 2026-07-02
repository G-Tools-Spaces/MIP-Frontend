"use client";

import { api } from "@/lib/api/client";

export type AuditActorType = "USER" | "SYSTEM" | "APPLICATION" | "ANONYMOUS";
export type AuditStatus = "SUCCESS" | "FAILURE" | "PENDING";

export type AuditEvent = {
  id: string;
  organizationId?: string;
  actorType: AuditActorType;
  actorId?: string;
  actorLabel?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  status: AuditStatus;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  detail?: Record<string, unknown>;
  occurredAt: string;
};

export type AuditPage = {
  content: AuditEvent[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AuditQuery = {
  page?: number;
  size?: number;
  actorType?: AuditActorType;
  status?: AuditStatus;
  action?: string;
  from?: string;
  to?: string;
};

export const auditApi = {
  list: (organizationId: string, query: AuditQuery = {}) =>
    api
      .get<AuditPage>(
        `/api/v1/organizations/${organizationId}/audit`,
        { params: query },
      )
      .then((r) => r.data),
};
