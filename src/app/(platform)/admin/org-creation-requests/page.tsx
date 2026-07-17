"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  onboardingApi,
  type OrgCreationRequestStatus,
} from "@/lib/api/endpoints/onboarding";
import { ApiError } from "@/lib/api/problem";

/**
 * Global Admin queue for organization-creation requests. See
 * ONBOARDING_FLOW.md §4 — this is the review dashboard used by the
 * single Platform Admin to approve or reject "Setup Your Business"
 * submissions.
 *
 * Access is gated by the backend (`assertPlatformAdmin`) — a non-admin
 * hitting this page will simply see 403 errors on every query.
 */
export default function PlatformAdminOrgCreationQueuePage() {
  const [status, setStatus] = useState<OrgCreationRequestStatus>("PENDING");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ["platformAdmin", "orgCreationQueue", status],
    queryFn: () =>
      onboardingApi.listOrgCreationQueue({ status, page: 0, size: 50 }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["platformAdmin", "orgCreationQueue"],
    });

  const approveMutation = useMutation({
    mutationFn: (id: string) => onboardingApi.approveOrgCreationRequest(id),
    onSuccess: (r) => {
      toast.success(
        `Approved. Organization "${r.proposedName}" is now ACTIVE.`,
      );
      invalidate();
    },
    onError: (e: ApiError) =>
      toast.error(e.problem.detail ?? "Approval failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      onboardingApi.rejectOrgCreationRequest(id, reason || undefined),
    onSuccess: () => {
      toast.success("Request rejected.");
      setRejectingId(null);
      setReason("");
      invalidate();
    },
    onError: (e: ApiError) =>
      toast.error(e.problem.detail ?? "Rejection failed"),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Organization creation queue
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Review and decide on new business submissions.
          </p>
        </div>
        <div className="w-52">
          <Select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as OrgCreationRequestStatus)
            }
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
      </header>

      {queueQuery.isLoading ? (
        <p className="text-sm text-slate-400">Loading queue…</p>
      ) : queueQuery.isError ? (
        <p className="text-sm text-red-600">
          Unable to load queue — you may not have platform-admin access.
        </p>
      ) : !queueQuery.data?.content?.length ? (
        <p className="text-sm text-slate-400">
          Nothing in this bucket right now.
        </p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {queueQuery.data.content.map((r) => (
            <div key={r.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold">
                    {r.proposedName}{" "}
                    <code className="text-xs text-slate-500">
                      /{r.proposedSlug}
                    </code>
                  </p>
                  <p className="text-xs text-slate-500">
                    Submitted {new Date(r.submittedAt).toLocaleString()} by{" "}
                    <code>{r.requesterUserId.slice(0, 8)}…</code> · {r.invitees.length} invitee(s)
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <dl className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {r.businessEmail && (
                  <Info label="Email" value={r.businessEmail} />
                )}
                {r.businessPhone && (
                  <Info label="Phone" value={r.businessPhone} />
                )}
                {r.businessWebsite && (
                  <Info label="Website" value={r.businessWebsite} />
                )}
                {r.businessCountry && (
                  <Info label="Country" value={r.businessCountry} />
                )}
                {r.businessSize && (
                  <Info label="Size" value={r.businessSize} />
                )}
                {r.businessIndustry && (
                  <Info label="Industry" value={r.businessIndustry} />
                )}
              </dl>

              {r.justification && (
                <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-3 text-xs">
                  <p className="font-medium text-slate-600 dark:text-slate-400">
                    Justification
                  </p>
                  <p className="mt-1">{r.justification}</p>
                </div>
              )}

              {r.invitees.length > 0 && (
                <div className="text-xs">
                  <p className="font-medium text-slate-600 dark:text-slate-400">
                    Invitees
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {r.invitees.map((i) => (
                      <li key={i.id}>
                        <Badge tone="indigo">
                          {i.email} · {i.role}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {r.status === "PENDING" && (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(r.id)}
                    loading={
                      approveMutation.isPending &&
                      approveMutation.variables === r.id
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRejectingId(r.id);
                      setReason("");
                    }}
                  >
                    Reject
                  </Button>
                </div>
              )}

              {r.status !== "PENDING" && r.decisionReason && (
                <p className="text-xs text-slate-500">
                  Decision reason: {r.decisionReason}
                </p>
              )}

              {rejectingId === r.id && (
                <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 space-y-2">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300">
                    Reason for rejection (optional but recommended)
                  </p>
                  <textarea
                    className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-sm"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRejectingId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      loading={rejectMutation.isPending}
                      onClick={() =>
                        rejectMutation.mutate({ id: r.id, reason })
                      }
                    >
                      Confirm reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-slate-500">{label}</p>
    <p className="text-slate-900 dark:text-slate-100 break-words">{value}</p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<
    string,
    { label: string; tone: "amber" | "emerald" | "red" | "neutral" }
  > = {
    PENDING: { label: "Pending", tone: "amber" },
    APPROVED: { label: "Approved", tone: "emerald" },
    REJECTED: { label: "Rejected", tone: "red" },
    CANCELLED: { label: "Cancelled", tone: "neutral" },
  };
  const cfg = map[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
};
