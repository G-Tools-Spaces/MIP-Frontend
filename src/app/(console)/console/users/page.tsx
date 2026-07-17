"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users as UsersIcon,
  Search,
  UserCheck,
  UserX,
  UserMinus,
} from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import {
  usersApi,
  type OrgMember,
  type UserStatus,
} from "@/lib/api/endpoints/users";
import { ApiError } from "@/lib/api/problem";
import { useCurrentOrgId } from "@/stores/session-store";
import { dateTime, relativeTime, nullable } from "@/lib/format";

const statusTone: Record<UserStatus, Parameters<typeof Badge>[0]["tone"]> = {
  ACTIVE: "emerald",
  PENDING_VERIFICATION: "amber",
  SUSPENDED: "red",
  DEACTIVATED: "neutral",
};

export default function UsersPage() {
  const orgId = useCurrentOrgId();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const usersQuery = useQuery({
    queryKey: ["users", orgId],
    queryFn: () => usersApi.listByOrganization(orgId!),
    enabled: !!orgId,
  });

  const filtered = useMemo(() => {
    if (!usersQuery.data) return usersQuery.data;
    const q = query.trim().toLowerCase();
    if (!q) return usersQuery.data;
    return usersQuery.data.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q),
    );
  }, [usersQuery.data, query]);

  const onError = (e: ApiError) =>
    toast.error(e.problem.detail ?? e.problem.title);
  const onSettled = () =>
    qc.invalidateQueries({ queryKey: ["users", orgId] });

  const suspend = useMutation({
    mutationFn: (id: string) => usersApi.suspend(id),
    onSuccess: () => toast.success("User suspended"),
    onError,
    onSettled,
  });
  const activate = useMutation({
    mutationFn: (id: string) => usersApi.activate(id),
    onSuccess: () => toast.success("User activated"),
    onError,
    onSettled,
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => toast.success("User deactivated"),
    onError,
    onSettled,
  });

  const roleTone: Record<
    OrgMember["role"],
    Parameters<typeof Badge>[0]["tone"]
  > = {
    OWNER: "violet",
    ADMIN: "indigo",
    MEMBER: "neutral",
    GUEST: "amber",
  };

  const columns: Column<OrgMember>[] = [
    {
      key: "user",
      header: "User",
      render: (u) => (
        <Link
          href={`/console/users/${u.id}`}
          className="flex items-center gap-3"
        >
          <Avatar name={u.displayName} src={u.profilePictureUrl} size="sm" />
          <div className="min-w-0">
            <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
              {u.displayName}
            </div>
            <div className="text-xs text-slate-500 truncate">{u.email}</div>
          </div>
        </Link>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <Badge tone={roleTone[u.role]}>{u.role}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <div className="flex items-center gap-2">
          <Badge tone={statusTone[u.status]}>{u.status}</Badge>
          {u.membershipStatus !== "ACTIVE" && (
            <Badge tone="neutral">{u.membershipStatus.toLowerCase()}</Badge>
          )}
          {!u.emailVerified && (
            <Badge tone="amber">unverified</Badge>
          )}
        </div>
      ),
    },
    {
      key: "lastLogin",
      header: "Last login",
      render: (u) => (
        <span
          className="text-slate-500 dark:text-slate-400"
          title={dateTime(u.lastLoginAt)}
        >
          {relativeTime(u.lastLoginAt)}
        </span>
      ),
    },
    {
      key: "locale",
      header: "Locale",
      render: (u) => nullable(u.locale),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      headerClassName: "text-right",
      render: (u) => (
        <div className="flex items-center justify-end">
          <Dropdown
            trigger={<Button variant="ghost" size="sm">Actions</Button>}
          >
            {(close) => (
              <>
                <DropdownItem
                  onClick={() => {
                    close();
                    activate.mutate(u.id);
                  }}
                >
                  <UserCheck className="h-4 w-4 text-slate-400" /> Activate
                </DropdownItem>
                <DropdownItem
                  onClick={() => {
                    close();
                    suspend.mutate(u.id);
                  }}
                >
                  <UserMinus className="h-4 w-4 text-slate-400" /> Suspend
                </DropdownItem>
                <DropdownItem
                  destructive
                  onClick={() => {
                    close();
                    deactivate.mutate(u.id);
                  }}
                >
                  <UserX className="h-4 w-4" /> Deactivate
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      ),
    },
  ];

  if (!orgId) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Users" description="Manage everyone in your organization." />
        <Alert variant="warning" title="No organization context">
          Sign in with an organization to manage users.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Users"
        description="Manage everyone in your organization, review lifecycle, and audit activity."
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-slate-500 ml-auto">
          {usersQuery.data?.length ?? 0} total
        </span>
      </div>

      {filtered && filtered.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={query ? "No matches" : "No users yet"}
          description={
            query
              ? "Try clearing your search."
              : "Invite your first teammate to get started."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          loading={usersQuery.isLoading}
          rowKey={(u) => u.id}
        />
      )}
    </div>
  );
}
