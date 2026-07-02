import { formatDistanceToNow, format } from "date-fns";

/** ISO string → "3 hours ago"; graceful fallback for empty/invalid. */
export const relativeTime = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
};

/** ISO string → "Feb 12, 2026, 3:04 PM". */
export const dateTime = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "PPp");
};

/** ISO string → "Feb 12, 2026". */
export const dateOnly = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "PP");
};

/** Format a number with locale grouping; "—" for null/undefined. */
export const num = (n?: number | null): string => {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString();
};

/** Render a nullable string with an em-dash fallback. */
export const nullable = (v?: string | null): string =>
  v && v.trim().length ? v : "—";
