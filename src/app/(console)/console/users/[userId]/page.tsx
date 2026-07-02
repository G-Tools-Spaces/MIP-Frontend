"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, MapPin, Shield } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usersApi } from "@/lib/api/endpoints/users";
import { dateTime, nullable, relativeTime } from "@/lib/format";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const userQuery = useQuery({
    queryKey: ["user", userId],
    queryFn: () => usersApi.byId(userId),
  });

  if (userQuery.isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const u = userQuery.data;
  if (!u) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/console/users"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to users
      </Link>

      <PageHeader
        title={u.displayName}
        description={u.email}
        actions={<Badge tone="emerald">{u.status}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={u.displayName} src={u.profilePictureUrl} size="lg" />
              <div>
                <div className="font-medium">{u.displayName}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Email verified
                </dt>
                <dd>{u.emailVerified ? "Yes" : "No"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Timezone
                </dt>
                <dd>{nullable(u.timezone)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Locale</dt>
                <dd>{nullable(u.locale)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Phone</dt>
                <dd>{nullable(u.phoneNumber)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-400" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-slate-500">Last login</dt>
                <dd title={dateTime(u.lastLoginAt)}>
                  {relativeTime(u.lastLoginAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Last login IP</dt>
                <dd>{nullable(u.lastLoginIp)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Password changed</dt>
                <dd title={dateTime(u.passwordChangedAt)}>
                  {relativeTime(u.passwordChangedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Failed attempts</dt>
                <dd>{u.failedLoginAttempts ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Locked until</dt>
                <dd title={dateTime(u.lockedUntil)}>
                  {u.lockedUntil ? relativeTime(u.lockedUntil) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Account created</dt>
                <dd title={dateTime(u.createdAt)}>
                  {relativeTime(u.createdAt)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
