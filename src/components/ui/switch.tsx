"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal accessible toggle switch — headless, keyboard-friendly.
 */
export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...aria
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onCheckedChange(!checked)}
    disabled={disabled}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      checked
        ? "bg-indigo-600"
        : "bg-slate-200 dark:bg-slate-700",
      className,
    )}
    {...aria}
  >
    <span
      className={cn(
        "pointer-events-none inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white shadow ring-0 transition",
        checked && "translate-x-[18px]",
      )}
    />
  </button>
);
