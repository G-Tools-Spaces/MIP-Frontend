"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Laptop, LogOut, Shield, ShieldOff } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionsApi, type AuthSession } from "@/lib/api/endpoints/sessions";
import { useCurrentUser, useCurrentOrgSlug } from "@/stores/session-store";
import { ApiError } from "@/lib/api/problem";
import { dateTime, nullable, relativeTime } from "@/lib/format";

/**
 * Profile page.
 *
 * UX rules for the "Active sessions" card:
 *  - Card body caps its height and scrolls internally so the outer page never
 *    grows a mile long when there are many sessions.
 *  - Each row is compact (single line title, two sublines) — no chunky
 *    borders that pad the list vertically.
 *  - A "Revoke all others" primary action lives next to the card title for
 *    the common "someone might be logged in on my old laptop" case.
 *  - Each non-current row exposes an individual "Revoke" button.
 */
export default function ProfilePage() {
  const user = useCurrentUser();
  const orgSlug = useCurrentOrgSlug();
  const qc = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionsApi.listMine(),
    enabled: !!user,
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.revoke(sessionId),
    onSuccess: () => {
      toast.success("Session terminated");
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: ApiError) =>
      toast.error(e.problem?.detail ?? e.problem?.title ?? "Failed to revoke"),
  });

  const revokeAllOthersMutation = useMutation({
    mutationFn: () => sessionsApi.revokeAllOthers(),
    onSuccess: () => {
      toast.success("All other sessions terminated");
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: ApiError) =>
      toast.error(e.problem?.detail ?? e.problem?.title ?? "Failed to revoke"),
  });

  const sessions = sessionsQuery.data ?? [];
  const otherActiveCount = sessions.filter(
    (s: AuthSession) => !s.current && s.status === "ACTIVE",
  ).length;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Your profile"
        description="Personal details and active sessions."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Account card ---------------------------------------------------- */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={user?.displayName ?? "?"} size="lg" />
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

        {/* Sessions card --------------------------------------------------- */}
        <Card className="md:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Laptop className="h-4 w-4 text-slate-400" /> Active sessions
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Devices currently signed in to your account.
              </p>
            </div>
            {otherActiveCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                loading={revokeAllOthersMutation.isPending}
                onClick={() => revokeAllOthersMutation.mutate()}
              >
                <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                Revoke all others
              </Button>
            )}
          </CardHeader>

          {/* Scrollable list — caps the vertical footprint of the card. */}
          <CardContent className="max-h-[24rem] overflow-y-auto pr-1">
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {sessionsQuery.isLoading && (
                <li className="py-3">
                  <Skeleton className="h-10" />
                </li>
              )}

              {sessionsQuery.data && sessionsQuery.data.length === 0 && (
                <li className="py-6 text-sm text-slate-500 text-center">
                  Nothing to show yet.
                </li>
              )}

              {sessions.map((s) => {
                const isRevoking =
                  revokeMutation.isPending && revokeMutation.variables === s.id;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium truncate">
                          {nullable(s.deviceLabel ?? s.browser)}
                        </span>
                        {s.current && (
                          <Badge tone="indigo" className="shrink-0">
                            This device
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                        {nullable(s.os)} · {nullable(s.ipAddress)} ·{" "}
                        <span title={dateTime(s.lastActiveAt)}>
                          {relativeTime(s.lastActiveAt)}
                        </span>
                      </div>
                    </div>

                    {!s.current && s.status === "ACTIVE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={isRevoking}
                        onClick={() => revokeMutation.mutate(s.id)}
                        aria-label={`Terminate session ${s.id}`}
                      >
                        <LogOut className="mr-1.5 h-3.5 w-3.5" />
                        Terminate
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
