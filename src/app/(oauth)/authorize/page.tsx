"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, CheckCircle2, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Logo } from "@/components/brand/logo";
import { useCurrentUser, useCurrentOrgSlug } from "@/stores/session-store";

/**
 * User-facing consent screen. The backend renders /oauth2/authorize
 * server-side, but this page lets us present a branded consent step
 * when a client is not yet trusted.
 */
function ConsentContent() {
  const params = useSearchParams();
  const clientName = params.get("client_name") ?? params.get("client_id") ?? "an application";
  const scopes = (params.get("scope") ?? "openid profile").split(/\s+/).filter(Boolean);
  const user = useCurrentUser();
  const orgSlug = useCurrentOrgSlug();

  const returnUrl = params.get("state")
    ? `/oauth2/authorize?${params.toString()}`
    : "/oauth2/authorize";

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Logo />
        <CardTitle className="mt-4 text-lg">
          Authorize <span className="text-indigo-600">{clientName}</span>?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium">
            {user?.displayName ?? user?.email ?? "You"}
          </span>{" "}
          in{" "}
          <span className="font-mono text-xs">{orgSlug ?? "your org"}</span>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
            This app will be able to
          </p>
          <ul className="space-y-1 text-sm">
            {scopes.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <code className="font-mono text-xs">{s}</code>
              </li>
            ))}
          </ul>
        </div>

        <Alert variant="info" title="Verify before allowing">
          Only continue if you recognize this application.
        </Alert>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={`${returnUrl}&decision=deny`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <XCircle className="mr-2 h-4 w-4" /> Deny
          </a>
          <a
            href={`${returnUrl}&decision=allow`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Shield className="mr-2 h-4 w-4" /> Allow
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OAuthConsentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <Suspense fallback={<div className="h-40" />}>
        <ConsentContent />
      </Suspense>
    </div>
  );
}
