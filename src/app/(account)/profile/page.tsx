"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Laptop, LogOut, Shield } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionsApi } from "@/lib/api/endpoints/sessions";
import { useCurrentUser, useCurrentOrgSlug } from "@/stores/session-store";
import { dateTime, nullable, relativeTime } from "@/lib/format";

export default function ProfilePage() {
  const user = useCurrentUser();
  const orgSlug = useCurrentOrgSlug();
  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionsApi.listMine(),
    enabled: !!user,
  });

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Your profile"
        description="Personal details and active sessions."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={user?.displayName ?? "?"}
                size="lg"
              />
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {user?.displayName ?? "—"}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {user?.email ?? "—"}
                </div>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Email verified</dt>
                <dd>{user?.emailVerified ? "Yes" : "No"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Organization</dt>
                <dd className="font-mono text-xs">{nullable(orgSlug)}</dd>
              </div>
            </dl>
            <Link
              href="/profile/security"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              <Shield className="h-3.5 w-3.5" /> Manage security & MFA
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Laptop className="h-4 w-4 text-slate-400" /> Active sessions
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Devices currently signed in to your account.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionsQuery.isLoading && <Skeleton className="h-16" />}
            {sessionsQuery.data && sessionsQuery.data.length === 0 && (
              <p className="text-sm text-slate-500">Nothing to show yet.</p>
            )}
            {sessionsQuery.data?.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {nullable(s.deviceLabel ?? s.browser)}
                    </span>
                    {s.current && <Badge tone="indigo">This device</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {nullable(s.os)} · {nullable(s.ipAddress)} ·{" "}
                    {nullable(s.geoLocation)}
                  </div>
                  <div
                    className="text-xs text-slate-500"
                    title={dateTime(s.lastActiveAt)}
                  >
                    Last active {relativeTime(s.lastActiveAt)}
                  </div>
                </div>
                {!s.current && (
                  <button
                    onClick={() => sessionsApi.revoke(s.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Revoke
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
