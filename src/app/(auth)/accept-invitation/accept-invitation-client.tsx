"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { invitationsApi } from "@/lib/api/endpoints/invitations";
import { ApiError } from "@/lib/api/problem";
import { useSession } from "@/stores/session-store";
import { tokenStore } from "@/lib/auth/token-store";
import { dateTime } from "@/lib/format";

/**
 * Client body of /accept-invitation.
 *
 * Flow:
 *   1. Read {@code token} from the query string. If missing → error.
 *   2. If the user isn't authenticated yet, bounce them to /login (with
 *      ?returnTo pointing back here) so they can sign in / register first.
 *   3. Once authenticated, POST {invitationToken, userId} to
 *      {@code /api/v1/organizations/invitations/accept}.
 *   4. On success, refresh the token store's org binding by re-fetching
 *      memberships (handled by the console guard on next navigation) and
 *      send the user to /console.
 */
export const AcceptInvitationClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const user = useSession((s) => s.user);
  const status = useSession((s) => s.status);
  const hydrated = useSession((s) => s.hydrated);
  const authed = status === "authenticated" && !!user;

  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  // Guards against React 18 StrictMode's double-invocation of effects in
  // dev. Without this the auto-accept effect runs twice, the second call
  // races the first, and the SPA surfaces a spurious 500 (backend fails to
  // re-insert the membership because a unique constraint fires).
  const acceptFiredRef = useRef(false);

  // Redirect unauthenticated visitors to /login with a returnTo back here.
  // If they don't have an account yet, they can hit the "Create account"
  // link on the login page — the returnTo is preserved through registration
  // so they land back here after OTP verify + first login.
  useEffect(() => {
    if (!hydrated) return;
    if (authed) return;
    if (!token) return;
    const returnTo = encodeURIComponent(`/accept-invitation?token=${token}`);
    router.replace(`/login?returnTo=${returnTo}`);
  }, [hydrated, authed, router, token]);

  const acceptMutation = useMutation({
    mutationFn: () =>
      invitationsApi.accept({
        invitationToken: token as string,
        userId: user!.id,
      }),
    onSuccess: (inv) => {
      setAcceptedAt(inv.acceptedAt ?? new Date().toISOString());
      toast.success("Invitation accepted");
      // Clear the tokenStore's org binding so ConsoleAuthGuard will re-probe
      // memberships on the next navigation and pick up the new one.
      const snap = tokenStore.get();
      if (snap) tokenStore.set({ ...snap, organizationId: undefined, orgSlug: undefined });
    },
  });

  // If the accept call already succeeded once (or the user was already a
  // member — e.g. StrictMode double-fire during dev), treat that as
  // "accepted" and let the user proceed. This is the shape the console
  // guard's org self-heal needs anyway.
  const alreadyMember =
    acceptMutation.error instanceof ApiError &&
    acceptMutation.error.status === 409;

  // Auto-fire once we're authenticated with a token. Ref-guarded so
  // StrictMode's second effect run in dev does not re-POST and race the
  // in-flight request (which is what caused the "duplicate key value
  // violates unique_organization_user_membership" error).
  useEffect(() => {
    if (!token || !authed) return;
    if (acceptFiredRef.current) return;
    acceptFiredRef.current = true;
    acceptMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authed]);

  // Treat "already a member" as a soft success — clear the org binding so
  // the console guard picks up the membership on the next navigation.
  useEffect(() => {
    if (!alreadyMember) return;
    const snap = tokenStore.get();
    if (snap) tokenStore.set({ ...snap, organizationId: undefined, orgSlug: undefined });
  }, [alreadyMember]);

  const errorMessage = useMemo(() => {
    const err = acceptMutation.error;
    if (!(err instanceof ApiError)) return null;
    if (err.status === 404) return "This invitation link is invalid or was revoked.";
    if (err.status === 410) return "This invitation has expired.";
    // 409 is treated as a soft success below — do not surface as an error.
    if (err.status === 409) return null;
    return err.problem.detail ?? err.problem.title;
  }, [acceptMutation.error]);

  if (!token) {
    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Missing invitation token
        </h2>
        <Alert variant="error" title="This link is incomplete">
          The invitation URL is missing its token. Check the link your admin
          shared with you, or ask them to re-issue the invitation.
        </Alert>
        <Button variant="outline" onClick={() => router.push("/login")}>
          Back to sign in
        </Button>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Sign in to accept your invitation
        </h2>
        <p className="text-sm text-slate-500">
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  if (acceptMutation.isSuccess || alreadyMember) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            You're in!
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          {alreadyMember && !acceptedAt
            ? "You're already a member of this organisation."
            : `Membership created${acceptedAt ? ` on ${dateTime(acceptedAt)}` : ""}. You can now access the organisation's console.`}
        </p>
        <Button onClick={() => router.push("/console")} block size="lg">
          Go to console
        </Button>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-red-500" />
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Couldn't accept invitation
          </h2>
        </div>
        <Alert variant="error" title="We hit a snag">
          {errorMessage}
        </Alert>
        <div className="flex gap-2">
          <Button
            onClick={() => acceptMutation.mutate()}
            loading={acceptMutation.isPending}
          >
            Try again
          </Button>
          <Button variant="outline" onClick={() => router.push("/console")}>
            Go to console
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Joining organisation…
      </h2>
      <div className="flex items-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Accepting your invitation.</span>
      </div>
    </div>
  );
};
