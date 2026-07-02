"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const EmptyState: React.FC<{
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, description, action, className }) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/20",
      className,
    )}
  >
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <Icon className="h-6 w-6 text-slate-400" />
    </span>
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);
