"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, PowerOff, RotateCcw, Zap } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  applicationsApi,
  type ClientApplicationCredentials,
} from "@/lib/api/endpoints/applications";
import { ApiError } from "@/lib/api/problem";
import { useCurrentOrgId } from "@/stores/session-store";
import { dateTime } from "@/lib/format";

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);
  const orgId = useCurrentOrgId();
  const qc = useQueryClient();

  const appQuery = useQuery({
    queryKey: ["application", orgId, applicationId],
    queryFn: () => applicationsApi.get(orgId!, applicationId),
    enabled: !!orgId,
  });

  const [rotatedSecret, setRotatedSecret] =
    useState<ClientApplicationCredentials | null>(null);

  const rotateMutation = useMutation({
    mutationFn: () => applicationsApi.rotateSecret(orgId!, applicationId),
    onSuccess: (creds) => {
      toast.success("Client secret rotated");
      setRotatedSecret(creds);
    },
    onError: (e: ApiError) => toast.error(e.problem.detail ?? e.problem.title),
  });

  const statusMutation = useMutation({
    mutationFn: (status: "ACTIVE" | "SUSPENDED" | "REVOKED") =>
      applicationsApi.updateStatus(orgId!, applicationId, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({
        queryKey: ["application", orgId, applicationId],
      });
    },
    onError: (e: ApiError) => toast.error(e.problem.detail ?? e.problem.title),
  });

  if (!orgId) return null;
  if (appQuery.isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  const app = appQuery.data;
  if (!app) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/console/applications"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to applications
      </Link>

      <PageHeader
        title={app.name}
        description={app.description ?? undefined}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                statusMutation.mutate(
                  app.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                )
              }
              loading={statusMutation.isPending}
            >
              {app.status === "ACTIVE" ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" /> Suspend
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" /> Reactivate
                </>
              )}
            </Button>
            <Button
              onClick={() => rotateMutation.mutate()}
              loading={rotateMutation.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Rotate secret
            </Button>
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-400" /> OAuth client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Client ID</span>
              <span className="font-mono truncate">{app.clientId}</span>
              <CopyButton value={app.clientId} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Type</span>
              <Badge tone="indigo">{app.applicationType}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Public client</span>
              <span>{app.confidential ? "No" : "Yes"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <Badge
                tone={
                  app.status === "ACTIVE"
                    ? "emerald"
                    : app.status === "SUSPENDED"
                      ? "amber"
                      : "red"
                }
              >
                {app.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Created</span>
              <span>{dateTime(app.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Redirect &amp; Logout URIs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Redirect URIs
              </div>
              <ul className="space-y-1">
                {(app.redirectUris ?? []).length === 0 && (
                  <li className="text-slate-500">—</li>
                )}
                {(app.redirectUris ?? []).map((u) => (
                  <li
                    key={u}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1 font-mono text-xs dark:bg-slate-900"
                  >
                    <span className="truncate">{u}</span>
                    <CopyButton value={u} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Post-logout URIs
              </div>
              <ul className="space-y-1">
                {(app.postLogoutRedirectUris ?? []).length === 0 && (
                  <li className="text-slate-500">—</li>
                )}
                {(app.postLogoutRedirectUris ?? []).map((u) => (
                  <li
                    key={u}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1 font-mono text-xs dark:bg-slate-900"
                  >
                    <span className="truncate">{u}</span>
                    <CopyButton value={u} />
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!rotatedSecret}
        onOpenChange={(o) => !o && setRotatedSecret(null)}
        title="New client_secret"
        description="Copy this now — it will not be shown again."
        footer={<Button onClick={() => setRotatedSecret(null)}>Done</Button>}
      >
        {rotatedSecret && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="text-xs text-amber-700 dark:text-amber-300">
              client_secret
            </div>
            <div className="mt-1 flex items-center justify-between font-mono text-sm">
              <span className="truncate">{rotatedSecret.clientSecret}</span>
              <CopyButton value={rotatedSecret.clientSecret} />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
