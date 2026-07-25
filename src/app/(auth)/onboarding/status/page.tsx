"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { onboardingApi } from "@/lib/api/endpoints/onboarding";
import { useSession } from "@/stores/session-store";

/**
 * Read-only dashboard of the current user's pending organization-creation
 * requests. Shown when a user needs to wait for platform admin approval.
 *
 * V18+ behaviour: the moment the caller has at least one ACTIVE
 * organization membership we auto-redirect them into the console.
 *
 *   • We poll {@code /onboarding/me/memberships} every 5s.
 *   • The current access token has NO {@code org_id} claim yet (they had
 *     no memberships at login time), and the SPA does not persist the
 *     refresh token client-side, so we cannot silently rotate tokens.
 *     Instead we bounce them through /login with the email pre-filled and
 *     {@code returnTo=/console} — signing in again mints a JWT bound to
 *     the freshly-approved organization and lands them on the dashboard.
 */
export default function OnboardingStatusPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const clearSession = useSession((s) => s.clear);
  const [redirected, setRedirected] = useState(false);

  const creationRequestsQuery = useQuery({
    queryKey: ["onboarding", "myCreationRequests"],
    queryFn: () => onboardingApi.listMyOrgCreationRequests(),
  });

  // Poll memberships so we can react the instant a request is approved.
  const membershipsQuery = useQuery({
    queryKey: ["onboarding", "myMemberships"],
    queryFn: () => onboardingApi.myMemberships(),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (redirected) return;
    const memberships = membershipsQuery.data ?? [];
    const hasActive = memberships.some((m) => m.status === "ACTIVE");
    if (!hasActive) return;

    setRedirected(true);
    toast.success(
      "Your request was approved. Please sign in again to enter the console.",
    );
    // Blow away the (stale, org-less) session so the console guard doesn't
    // rehydrate us with an unusable token.
    clearSession();
    const email = user?.email
      ? `&email=${encodeURIComponent(user.email)}`
      : "";
    router.replace(`/login?returnTo=%2Fconsole${email}`);
  }, [membershipsQuery.data, redirected, router, user?.email, clearSession]);

  const cancelCreation = useMutation({
    mutationFn: (id: string) => onboardingApi.cancelOrgCreationRequest(id),
    onSuccess: () => {
      toast.success("Request cancelled.");
      queryClient.invalidateQueries({
        queryKey: ["onboarding", "myCreationRequests"],
      });
    },
  });

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Your onboarding
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Track your organization setup request. You&rsquo;ll be redirected to
          the console automatically once it&rsquo;s approved.
        </p>
      </header>

      {/* Creation requests */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Business setup requests
        </h2>
        {creationRequestsQuery.isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !creationRequestsQuery.data?.length ? (
          <p className="text-sm text-slate-400">
            No requests yet.{" "}
            <Link href="/onboarding/setup" className="underline">
              Set up a business
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
            {creationRequestsQuery.data.map((r) => (
              <li key={r.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {r.proposedName}{" "}
                    <code className="text-xs text-slate-500">
                      /{r.proposedSlug}
                    </code>
                  </p>
                  <p className="text-xs text-slate-500">
                    Submitted {new Date(r.submittedAt).toLocaleString()} ·{" "}
                    {r.invitees.length} invitee(s)
                  </p>
                  {r.decisionReason && (
                    <p className="text-xs text-slate-500 mt-1">
                      Admin note: {r.decisionReason}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  {r.status === "PENDING" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelCreation.mutate(r.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pt-2">
        <Link
          href="/onboarding/choose"
          className="text-xs underline text-slate-500"
        >
          ← Back to onboarding
        </Link>
      </div>
    </div>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<
    string,
    { label: string; tone: "amber" | "emerald" | "red" | "neutral" }
  > = {
    PENDING: { label: "Pending", tone: "amber" },
    APPROVED: { label: "Approved", tone: "emerald" },
    REJECTED: { label: "Rejected", tone: "red" },
    CANCELLED: { label: "Cancelled", tone: "neutral" },
  };
  const cfg = map[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
};
