import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names deterministically.
 * Used by every shadcn-style component in the UI kit.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
