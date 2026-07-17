"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRound, Radio } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Skeleton } from "@/components/ui/skeleton";
import { oidcApi } from "@/lib/api/endpoints/oidc";

export default function OidcDiscoveryPage() {
  const disc = useQuery({
    queryKey: ["oidc-discovery"],
    queryFn: () => oidcApi.discovery(),
  });
  const jwks = useQuery({
    queryKey: ["oidc-jwks"],
    queryFn: () => oidcApi.jwks(),
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-4xl min-w-0">
        <PageHeader
          title="OIDC Discovery"
          description="Standards-compliant metadata for your identity provider."
        />

        <div className="grid gap-6">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-indigo-500" />
                openid-configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              {disc.isLoading && <Skeleton className="h-40" />}
              {disc.data && (
                <div className="space-y-2 min-w-0">
                  {/*
                    `whitespace-pre-wrap` + `break-all` forces JSON values
                    with long unbroken tokens (RSA modulus, URLs) to soft-
                    wrap. `max-w-full` + `min-w-0` keeps the <pre> inside
                    the card so the viewport doesn't get a horizontal
                    scrollbar — internal vertical scrolling still handles
                    tall payloads.
                  */}
                  <pre className="max-h-96 max-w-full min-w-0 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                    {JSON.stringify(disc.data, null, 2)}
                  </pre>
                  <div className="flex justify-end">
                    <CopyButton
                      value={JSON.stringify(disc.data, null, 2)}
                      label="Copy JSON"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-violet-500" />
                JWKS ({jwks.data?.keys.length ?? "…"} keys)
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              {jwks.isLoading && <Skeleton className="h-40" />}
              {jwks.data && (
                <div className="space-y-2 min-w-0">
                  <pre className="max-h-96 max-w-full min-w-0 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                    {JSON.stringify(jwks.data, null, 2)}
                  </pre>
                  <div className="flex justify-end">
                    <CopyButton
                      value={JSON.stringify(jwks.data, null, 2)}
                      label="Copy JSON"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
