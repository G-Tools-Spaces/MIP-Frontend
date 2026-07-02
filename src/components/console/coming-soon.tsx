"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageHeader } from "./page-header";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Generic placeholder for console pages whose backing UI is planned in a
 * later phase. Keeps navigation working end-to-end so the shell can be QA'd.
 */
export const ComingSoon: React.FC<{
  title: string;
  description: string;
  phase: string;
}> = ({ title, description, phase }) => (
  <div className="max-w-5xl mx-auto">
    <PageHeader
      title={title}
      description={description}
      actions={
        <Link
          href="/console"
          className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
        >
          ← Back to dashboard
        </Link>
      }
    />
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
          <Sparkles className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Landing in {phase}
          </h2>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            The backing APIs are already live on the Spring backend — this UI
            is on the roadmap and will follow the console shell we just
            shipped.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);
