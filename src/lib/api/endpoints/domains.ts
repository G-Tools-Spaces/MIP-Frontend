"use client";

import { api } from "@/lib/api/client";

export type DomainStatus = "PENDING" | "VERIFIED" | "FAILED";

export type CustomDomain = {
  id: string;
  organizationId: string;
  domain: string;
  status: DomainStatus;
  verificationToken?: string;
  verificationMethod: "DNS_TXT" | "HTTP_FILE";
  verifiedAt?: string;
  createdAt: string;
};

export const domainsApi = {
  list: (organizationId: string) =>
    api
      .get<CustomDomain[]>(
        `/api/v1/organizations/${organizationId}/custom-domains`,
      )
      .then((r) => r.data),

  create: (organizationId: string, domain: string) =>
    api
      .post<CustomDomain>(
        `/api/v1/organizations/${organizationId}/custom-domains`,
        { domain },
      )
      .then((r) => r.data),

  verify: (organizationId: string, domainId: string) =>
    api
      .post<CustomDomain>(
        `/api/v1/organizations/${organizationId}/custom-domains/${domainId}/verify`,
      )
      .then((r) => r.data),

  delete: (organizationId: string, domainId: string) =>
    api
      .delete<void>(
        `/api/v1/organizations/${organizationId}/custom-domains/${domainId}`,
      )
      .then((r) => r.data),
};
