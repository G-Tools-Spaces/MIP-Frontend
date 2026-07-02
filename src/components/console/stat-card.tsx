"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Compact stat card used across the dashboard.
 * Renders a skeleton while `loading` is true so pages feel instant.
 */
export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: "indigo" | "violet" | "sky" | "emerald" | "amber";
  loading?: boolean;
}> = ({ label, value, hint, icon: Icon, tone = "indigo", loading }) => {
  const toneClasses: Record<string, string> = {
    indigo:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300",
    violet:
      "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  };

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {value}
            </p>
          )}
          {hint && !loading && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          )}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            toneClasses[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
};
