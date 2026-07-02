"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const Avatar: React.FC<{
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ name, src, size = "md", className }) => {
  const sizeClass =
    size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn(
          "rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800",
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-semibold text-white ring-1 ring-white/10",
        sizeClass,
        className,
      )}
      aria-label={name}
    >
      {initialsFor(name)}
    </span>
  );
};
