import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
            <Compass className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Page not found
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The route you followed doesn&apos;t exist in this console.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/console"
            className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Back to dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
