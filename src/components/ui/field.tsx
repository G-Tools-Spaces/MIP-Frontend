"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Composed form field: <Label>, control, description, and error text.
 * Keeps auth forms consistent and accessible.
 */
export const Field: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <div className={cn("space-y-1.5", className)}>{children}</div>
);

export const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p className="text-xs text-red-600 dark:text-red-400">{message}</p>
  ) : null;

export const FieldHint: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <p className="text-xs text-slate-500 dark:text-slate-400">{children}</p>
);
