"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Users } from "lucide-react";

import { useCurrentUser } from "@/stores/session-store";

/**
 * Post-registration fork. See ONBOARDING_FLOW.md §2 — the user has just
 * verified their OTP, logged in, and needs to pick Flow 1 (join an
 * existing business) or Flow 2 (setup a new one).
 */
export default function ChooseOnboardingPathPage() {
  const router = useRouter();
  const user = useCurrentUser();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user?.displayName ? `Welcome, ${user.displayName.split(" ")[0]}!` : "Welcome!"}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          You&rsquo;re signed in but you&rsquo;re not part of any organization
          yet. Pick how you&rsquo;d like to proceed.
        </p>
      </header>

      <div className="grid gap-4">
        <PathCard
          icon={<Users className="h-5 w-5" />}
          title="Join an existing business"
          description="Enter a colleague's company email and we'll send a join request to their organization admin."
          cta="Join a business"
          onClick={() => router.push("/onboarding/join")}
        />
        <PathCard
          icon={<Building2 className="h-5 w-5" />}
          title="Setup your business"
          description="Create a new organization. A platform admin will review and approve it, then you'll be the owner."
          cta="Setup a business"
          onClick={() => router.push("/onboarding/setup")}
        />
      </div>

      <p className="text-xs text-slate-500 pt-2">
        Already submitted a request? See its status on{" "}
        <Link href="/onboarding/status" className="underline">
          your onboarding dashboard
        </Link>
        .
      </p>
    </div>
  );
}

const PathCard = ({
  icon,
  title,
  description,
  cta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-left transition hover:border-indigo-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
  >
    <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">
      {icon}
    </span>
    <span className="flex-1">
      <span className="block text-base font-semibold">{title}</span>
      <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
        {description}
      </span>
    </span>
    <span className="mt-1 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:border-indigo-400 group-hover:text-indigo-700">
      {cta}
    </span>
  </button>
);
