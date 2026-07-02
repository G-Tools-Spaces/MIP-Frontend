"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Boxes,
  Building2,
  Ghost,
  Server,
  Users,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { StatCard } from "@/components/console/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import {
  platformApi,
  type PlatformOrganizationSummary,
} from "@/lib/api/endpoints/platform";
import type { OrganizationStatus } from "@/lib/api/endpoints/organizations";
import { ApiError } from "@/lib/api/problem";
import { dateTime, num, relativeTime } from "@/lib/format";

const statusTone: Record<
  OrganizationStatus,
  Parameters<typeof Badge>[0]["tone"]
> = {
  ACTIVE: "emerald",
  SUSPENDED: "red",
};

export default function PlatformAdminPage() {
  const qc = useQueryClient();
  const statsQuery = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => platformApi.stats(),
  });
  const orgsQuery = useQuery({
    queryKey: ["platform-organizations"],
    queryFn: () => platformApi.organizations(),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: OrganizationStatus;
    }) => platformApi.updateOrganizationStatus(id, status),
    onSuccess: () => {
      toast.success("Organization updated");
      qc.invalidateQueries({ queryKey: ["platform-organizations"] });
      qc.invalidateQueries({ queryKey: ["platform-stats"] });
    },
    onError: (e: ApiError) => toast.error(e.problem.detail ?? e.problem.title),
  });

  const columns: Column<PlatformOrganizationSummary>[] = [
    {
      key: "name",
      header: "Organization",
      render: (o) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {o.name}
          </div>
          <div className="text-xs text-slate-500 font-mono">{o.slug}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <Badge tone={statusTone[o.status]}>{o.status}</Badge>,
    },
    { key: "users", header: "Users", render: (o) => num(o.userCount) },
    {
      key: "sessions",
      header: "Sessions",
      render: (o) => num(o.activeSessionCount),
    },
    {
      key: "created",
      header: "Created",
      render: (o) => (
        <span title={dateTime(o.createdAt)}>{relativeTime(o.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      headerClassName: "text-right",
      render: (o) => (
        <div className="flex justify-end">
          <Dropdown trigger={<Button variant="ghost" size="sm">Actions</Button>}>
            {(close) => (
              <>
                <DropdownItem
                  onClick={() => {
                    close();
                    updateStatus.mutate({ id: o.id, status: "ACTIVE" });
                  }}
                >
                  <Zap className="h-4 w-4 text-emerald-500" /> Activate
                </DropdownItem>
                <DropdownItem
                  destructive
                  onClick={() => {
                    close();
                    updateStatus.mutate({ id: o.id, status: "SUSPENDED" });
                  }}
                >
                  <Ghost className="h-4 w-4" /> Suspend
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Platform Admin"
        description="Global view across every tenant on MeiCrypt Identity."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <StatCard
          label="Organizations"
          value={num(statsQuery.data?.organizationCount)}
          hint={`${num(statsQuery.data?.activeOrganizationCount)} active`}
          icon={Building2}
          tone="indigo"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Users"
          value={num(statsQuery.data?.userCount)}
          icon={Users}
          tone="violet"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Active sessions"
          value={num(statsQuery.data?.activeSessionCount)}
          icon={Server}
          tone="emerald"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="OAuth apps"
          value={num(statsQuery.data?.clientApplicationCount)}
          icon={Boxes}
          tone="sky"
          loading={statsQuery.isLoading}
        />
      </section>

      <DataTable
        columns={columns}
        rows={orgsQuery.data}
        loading={orgsQuery.isLoading}
        rowKey={(o) => o.id}
      />
    </div>
  );
}
