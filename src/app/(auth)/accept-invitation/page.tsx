import { Suspense } from "react";
import { AcceptInvitationClient } from "./accept-invitation-client";

/**
 * Landing page for organisation invitations.
 *
 * Recipients arrive here via a URL of the form:
 *   /accept-invitation?token=<invitation_token>
 *
 * The page requires an authenticated session (the invitee's user account
 * must exist and be signed in with the email the invitation was sent to).
 * If unauthenticated it bounces to /login with a ?returnTo pointing back
 * here so the flow resumes automatically after sign-in.
 */
export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationClient />
    </Suspense>
  );
}
