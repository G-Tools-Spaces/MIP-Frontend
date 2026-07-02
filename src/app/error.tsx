"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The MeiCrypt Identity console hit an unexpected error. This
            incident has been logged.
          </p>
          {error.digest && (
            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
              digest {error.digest}
            </code>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Link
            href="/console"
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
