"use client";

import * as React from "react";
import { Shield } from "lucide-react";
import { env } from "@/env";
import { cn } from "@/lib/utils";

/**
 * MeiCrypt Identity brand mark.
 * Uses a shield glyph until a proper SVG asset is provided.
 */
export const Logo: React.FC<{ className?: string; withText?: boolean }> = ({
  className,
  withText = true,
}) => (
  <div className={cn("flex items-center gap-2", className)}>
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
      <Shield className="h-5 w-5 text-white" strokeWidth={2.25} />
    </div>
    {withText && (
      <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {env.appName}
      </span>
    )}
  </div>
);
