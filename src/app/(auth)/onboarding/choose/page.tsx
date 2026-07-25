"use client";

import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

import { useCurrentUser } from "@/stores/session-store";
import { OnboardingAuthGuard } from "@/components/onboarding/onboarding-auth-guard";

/**
 * Post-registration step. The user has just verified their email and logged in.
 * They must create a new organization before accessing the console.
 *
 * Note: Self-service "join existing org" was intentionally removed to prevent
 * mass/bulk join-request spam against existing organizations.
 * Users join existing orgs only via email invitation from an org admin.
 */
export default function ChooseOnboardingPathPage() {
  const router = useRouter();
  const user = useCurrentUser();

  return (
    <OnboardingAuthGuard>
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {user?.displayName
              ? `Welcome, ${user.displayName.split(" ")[0]}!`
              : "Welcome!"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You&rsquo;re signed in but you&rsquo;re not part of any organization
            yet. Create your organization to get started.
          </p>
        </header>

        <button
          type="button"
          onClick={() => router.push("/onboarding/setup")}
          className="group w-full flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-left transition hover:border-indigo-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-base font-semibold">
              Create your organization
            </span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
              Set up a new workspace. You&rsquo;ll be the owner and can invite
              your team by email right away.
            </span>
          </span>
          <span className="mt-1 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:border-indigo-400 group-hover:text-indigo-700">
            Get started
          </span>
        </button>

        <p className="text-xs text-slate-500">
          Already been invited to a team? Accept the invitation from the email
          your admin sent you.
        </p>
      </div>
    </OnboardingAuthGuard>
  );
}
