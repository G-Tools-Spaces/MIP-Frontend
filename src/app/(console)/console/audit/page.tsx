"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Filter, ChevronLeft, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import {
  auditApi,
  type AuditEvent,
  type AuditStatus,
  type AuditActorType,
} from "@/lib/api/endpoints/audit";
import { useCurrentOrgId } from "@/stores/session-store";
import { dateTime, nullable, relativeTime } from "@/lib/format";

const statusTone: Record<AuditStatus, Parameters<typeof Badge>[0]["tone"]> = {
  SUCCESS: "emerald",
  FAILURE: "red",
  PENDING: "amber",
};

const actorTone: Record<
  AuditActorType,
  Parameters<typeof Badge>[0]["tone"]
> = {
  USER: "indigo",
  SYSTEM: "neutral",
  APPLICATION: "sky",
  ANONYMOUS: "violet",
};

export default function AuditPage() {
  const orgId = useCurrentOrgId();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<AuditStatus | "">("");
  const [actorType, setActorType] = useState<AuditActorType | "">("");

  const query = useQuery({
    queryKey: ["audit", orgId, page, status, actorType],
    queryFn: () =>
      auditApi.list(orgId!, {
        page,
        size: 20,
        status: status || undefined,
        actorType: actorType || undefined,
      }),
    enabled: !!orgId,
  });

  const columns: Column<AuditEvent>[] = [
    {
      key: "when",
      header: "When",
      render: (r) => (
        <span title={dateTime(r.occurredAt)}>{relativeTime(r.occurredAt)}</span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      render: (r) => (
        <div className="space-y-0.5">
          <Badge tone={actorTone[r.actorType]}>{r.actorType}</Badge>
          <div className="text-xs text-slate-500">
            {nullable(r.actorLabel ?? r.actorId)}
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (r) => (
        <span className="font-mono text-xs">{r.action}</span>
      ),
    },
    {
      key: "resource",
      header: "Resource",
      render: (r) => (
        <div>
          <div className="text-xs text-slate-500">{nullable(r.resourceType)}</div>
          <div className="font-mono text-xs truncate max-w-[220px]">
            {nullable(r.resourceId)}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge tone={statusTone[r.status]}>{r.status}</Badge>,
    },
    {
      key: "ip",
      header: "IP",
      render: (r) => (
        <span className="font-mono text-xs">{nullable(r.ipAddress)}</span>
      ),
    },
  ];

  if (!orgId) {
    return (
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Audit Log"
          description="Immutable security event trail."
        />
        <Alert variant="warning" title="No organization context">
          Sign in with an organization to view its audit log.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Audit Log"
        description="Immutable security event trail — every action, every actor, forever."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="h-3.5 w-3.5" /> Filters
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setPage(0);
            setStatus(e.target.value as AuditStatus | "");
          }}
          className="w-40"
        >
          <option value="">All statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
          <option value="PENDING">Pending</option>
        </Select>
        <Select
          value={actorType}
          onChange={(e) => {
            setPage(0);
            setActorType(e.target.value as AuditActorType | "");
          }}
          className="w-44"
        >
          <option value="">All actors</option>
          <option value="USER">User</option>
          <option value="SYSTEM">System</option>
          <option value="APPLICATION">Application</option>
          <option value="ANONYMOUS">Anonymous</option>
        </Select>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span>
            Page {page + 1}
            {query.data ? ` of ${Math.max(1, query.data.totalPages)}` : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={
              !query.data || page + 1 >= (query.data.totalPages ?? 1)
            }
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {query.data && query.data.content.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit events"
          description="Nothing matching these filters yet."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.content}
          loading={query.isLoading}
          rowKey={(r) => r.id}
        />
      )}
    </div>
  );
}
