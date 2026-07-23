"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, UserPlus } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  joinRequestsApi,
  type JoinRequest,
  type JoinRequestStatus,
} from "@/lib/api/endpoints/join-requests";
import { ApiError } from "@/lib/api/problem";
import { useCurrentOrgId } from "@/stores/session-store";
import { dateTime, relativeTime } from "@/lib/format";

// ---- small helper ----
function name(r: JoinRequest): string {
  const first = r.requesterFirstName ?? "";
  const last = r.requesterLastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || r.userId;
}

const statusTone: Record<JoinRequestStatus, Parameters<typeof Badge>[0]["tone"]> = {
  PENDING: "amber",
  APPROVED: "emerald",
  REJECTED: "red",
};

export default function JoinRequestsPage() {
  const orgId = useCurrentOrgId();
  const qc = useQueryClient();

  // Dialog state for reject (needs a reason input)
  const [rejectTarget, setRejectTarget] = useState<JoinRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const requestsQuery = useQuery({
    queryKey: ["join-requests", orgId],
    queryFn: () => joinRequestsApi.listAll(orgId!),
    enabled: !!orgId,
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      joinRequestsApi.approve(requestId),
    onSuccess: (updated) => {
      toast.success(
        `${name(updated)} approved and added to the organisation.`,
      );
      qc.invalidateQueries({ queryKey: ["join-requests", orgId] });
    },
    onError: (err: ApiError) =>
      toast.error(err.problem.detail ?? err.problem.title),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      joinRequestsApi.reject(requestId, { reason }),
    onSuccess: () => {
      toast.success("Request rejected.");
      setRejectTarget(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["join-requests", orgId] });
    },
    onError: (err: ApiError) =>
      toast.error(err.problem.detail ?? err.problem.title),
  });

  const columns: Column<JoinRequest>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {name(r)}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (r) => (
        <span className="text-slate-600 dark:text-slate-400">
          {r.requesterEmail ?? <span className="text-slate-400">—</span>}
        </span>
      ),
    },
    {
      key: "message",
      header: "Message",
      render: (r) =>
        r.message ? (
          <span
            className="text-slate-500 dark:text-slate-400 max-w-xs block truncate"
            title={r.message}
          >
            {r.message}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge tone={statusTone[r.status]}>{r.status}</Badge>,
    },
    {
      key: "requested",
      header: "Requested",
      render: (r) => (
        <span
          title={dateTime(r.requestedAt)}
          className="text-slate-500 dark:text-slate-400"
        >
          {relativeTime(r.requestedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      headerClassName: "text-right",
      render: (r) =>
        r.status === "PENDING" ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={
                approveMutation.isPending && approveMutation.variables === r.id
              }
              onClick={() => approveMutation.mutate(r.id)}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectTarget(r);
                setRejectReason("");
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  if (!orgId) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Join Requests"
          description="Manage requests from users who want to join your organisation."
        />
        <Alert variant="warning" title="No organisation context">
          Sign in with an organisation to manage join requests.
        </Alert>
      </div>
    );
  }

  const pending = (requestsQuery.data ?? []).filter(
    (r) => r.status === "PENDING",
  );

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Join Requests"
        description="Approve or reject users requesting to join your organisation."
        actions={
          pending.length > 0 ? (
            <Badge tone="amber">{pending.length} pending</Badge>
          ) : null
        }
      />

      {requestsQuery.data && requestsQuery.data.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No join requests"
          description="When a user requests to join your organisation, it will appear here."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={requestsQuery.data}
          loading={requestsQuery.isLoading}
          rowKey={(r) => r.id}
        />
      )}

      {/* Reject dialog — collects optional reason */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
        title="Reject join request"
        description={
          rejectTarget
            ? `Reject the request from ${rejectTarget.requesterFirstName} ${rejectTarget.requesterLastName} (${rejectTarget.requesterEmail})?`
            : ""
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={rejectMutation.isPending}
              onClick={() => {
                if (rejectTarget) {
                  rejectMutation.mutate({
                    requestId: rejectTarget.id,
                    reason: rejectReason,
                  });
                }
              }}
            >
              Reject
            </Button>
          </>
        }
      >
        <Field>
          <Label htmlFor="reject-reason">Reason (optional)</Label>
          <Input
            id="reject-reason"
            placeholder="e.g. Does not belong to this organisation"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <FieldError message={undefined} />
        </Field>
      </Dialog>
    </div>
  );
}
