"use client";

import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Boxes,
  ScrollText,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/console/page-header";
import { StatCard } from "@/components/console/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/stores/session-store";
import { usersApi } from "@/lib/api/endpoints/users";
import { rbacApi } from "@/lib/api/endpoints/rbac";
import { applicationsApi } from "@/lib/api/endpoints/applications";
import { auditApi } from "@/lib/api/endpoints/audit";

/**
 * Console landing / overview dashboard.
 *
 * Stat cards are populated from the backend for the active organization.
 * If no organization id is present in the session yet, cards render zeros
 * so the dashboard doesn't sit in an infinite skeleton state.
 */
export default function ConsoleDashboardPage() {
  const user = useSession((s) => s.user);
  const orgSlug = useSession((s) => s.orgSlug);
  const organizationId = useSession((s) => s.organizationId);
  const hasOrg = Boolean(organizationId);

  // Active users count (falls back to full user list length if the count
  // endpoint isn't available for the caller's permissions).
  const activeUsersQ = useQuery({
    queryKey: ["dashboard", "active-users", organizationId],
    enabled: hasOrg,
    queryFn: async () => {
      try {
        return await usersApi.countActiveByOrganization(organizationId!);
      } catch {
        const list = await usersApi
          .listActiveByOrganization(organizationId!)
          .catch(() => [] as unknown[]);
        return list.length;
      }
    },
  });

  const rolesQ = useQuery({
    queryKey: ["dashboard", "roles", organizationId],
    enabled: hasOrg,
    queryFn: () => rbacApi.listRoles(organizationId!),
    select: (roles) => roles.length,
  });

  const applicationsQ = useQuery({
    queryKey: ["dashboard", "applications", organizationId],
    enabled: hasOrg,
    queryFn: () => applicationsApi.list(organizationId!),
    select: (apps) => apps.length,
  });

  const auditQ = useQuery({
    queryKey: ["dashboard", "audit-24h", organizationId],
    enabled: hasOrg,
    queryFn: () => {
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      return auditApi.list(organizationId!, { page: 0, size: 1, from });
    },
    select: (page) => page.totalElements ?? page.content?.length ?? 0,
  });

  const fmt = (n: number | undefined) =>
    typeof n === "number" ? n.toLocaleString() : "0";

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={`Welcome back${user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""} 👋`}
        description={
          orgSlug
            ? `You're managing the ${orgSlug} workspace.`
            : "Overview of your MeiCrypt Identity workspace."
        }
        actions={
          <>
            <Button variant="outline">View docs</Button>
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Quick actions
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <StatCard
          label="Active users"
          value={fmt(activeUsersQ.data)}
          hint="Signed in this month"
          icon={Users}
          tone="indigo"
          loading={hasOrg && activeUsersQ.isLoading}
        />
        <StatCard
          label="Roles"
          value={fmt(rolesQ.data)}
          hint="Custom + system"
          icon={ShieldCheck}
          tone="violet"
          loading={hasOrg && rolesQ.isLoading}
        />
        <StatCard
          label="Applications"
          value={fmt(applicationsQ.data)}
          hint="OAuth2 clients"
          icon={Boxes}
          tone="sky"
          loading={hasOrg && applicationsQ.isLoading}
        />
        <StatCard
          label="Audit events (24h)"
          value={fmt(auditQ.data)}
          hint="Security-relevant"
          icon={ScrollText}
          tone="emerald"
          loading={hasOrg && auditQ.isLoading}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              Complete these steps to spin up your identity workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                title: "Invite your first teammate",
                desc: "Add an admin to help manage the workspace.",
                href: "/console/invitations",
              },
              {
                title: "Configure organization settings",
                desc: "Timezone, password policy, and default locale.",
                href: "/console/settings",
              },
              {
                title: "Register an application",
                desc: "Issue OAuth2 client_id + client_secret credentials.",
                href: "/console/applications",
              },
              {
                title: "Design your roles & permissions",
                desc: "Fine-grained access with domain:resource:action grants.",
                href: "/console/roles",
              },
            ].map((step) => (
              <Link
                key={step.href}
                href={step.href}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {step.desc}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Audit events will appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              No events yet.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
