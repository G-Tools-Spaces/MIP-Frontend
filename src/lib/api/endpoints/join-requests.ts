"use client";

import { api } from "@/lib/api/client";

/**
 * Join Request client.
 *
 * Backend contract (see `JoinRequestController` — base path: /api/v1/onboarding/join-requests):
 *   POST   /api/v1/onboarding/join-requests                       — new user submits request
 *   GET    /api/v1/onboarding/join-requests/mine                  — requester's outgoing requests
 *   GET    /api/v1/onboarding/join-requests/pending?organizationId — admin lists PENDING for org
 *   POST   /api/v1/onboarding/join-requests/{id}/approve          — admin approves
 *   POST   /api/v1/onboarding/join-requests/{id}/reject           — admin rejects
 */

export type JoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface JoinRequest {
  id: string;
  organizationId: string;
  userId: string;
  requesterEmail: string | null;
  requesterFirstName: string | null;
  requesterLastName: string | null;
  /** Optional message the user typed when submitting */
  message: string | null;
  status: JoinRequestStatus;
  decidedByUserId: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  /** ISO-8601 timestamp from backend */
  requestedAt: string;
}

export interface DecidePayload {
  reason?: string;
}

export const joinRequestsApi = {
  /** List ALL (pending + decided) join requests for an organisation — admin view.
   *  Uses the /pending endpoint and the "all" variant via two calls is not available,
   *  so we use pending which gives pending only; history can be added later.
   *  For now we simply call /pending — if you want all statuses extend the backend.
   */
  listAll(orgId: string): Promise<JoinRequest[]> {
    return api
      .get<JoinRequest[]>(`/api/v1/onboarding/join-requests/pending`, {
        params: { organizationId: orgId },
      })
      .then((r) => r.data);
  },

  /** Approve a join request. */
  approve(requestId: string, payload?: DecidePayload): Promise<JoinRequest> {
    return api
      .post<JoinRequest>(
        `/api/v1/onboarding/join-requests/${requestId}/approve`,
        payload ?? {},
      )
      .then((r) => r.data);
  },

  /** Reject a join request. */
  reject(requestId: string, payload?: DecidePayload): Promise<JoinRequest> {
    return api
      .post<JoinRequest>(
        `/api/v1/onboarding/join-requests/${requestId}/reject`,
        payload ?? {},
      )
      .then((r) => r.data);
  },
};
