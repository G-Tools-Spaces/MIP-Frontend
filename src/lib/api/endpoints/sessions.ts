"use client";

import { api } from "@/lib/api/client";

/**
 * Session management client.
 *
 * Backend contract (see com.meicrypt.identity.auth.controller.SessionController):
 *   GET    /api/v1/sessions            → list active sessions for the caller
 *   DELETE /api/v1/sessions/{id}       → terminate a specific session
 *
 * The backend does not currently expose a "revoke all others" endpoint —
 * `revokeAllOthers` iterates client-side to keep the UX intact.
 */

/**
 * Raw shape returned by /api/v1/sessions (see auth.dto.SessionDTO).
 */
type BackendSession = {
  id: string;
  userId: string;
  organizationId: string;
  deviceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status: "ACTIVE" | "TERMINATED" | "EXPIRED" | string;
  createdAt: string;
  lastActivityAt?: string | null;
  expiresAt?: string | null;
};

/** UI-facing session shape. */
export type AuthSession = {
  id: string;
  userId: string;
  deviceLabel?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  geoLocation?: string;
  createdAt: string;
  lastActiveAt: string;
  status?: string;
  /** True if the caller inspecting the list is on this session (best-effort). */
  current: boolean;
};

/**
 * Extract a rough browser/OS label from a UA string. The backend doesn't
 * currently parse User-Agent, so we do a lightweight client-side heuristic
 * to keep the UI informative.
 */
const parseUserAgent = (ua?: string | null) => {
  if (!ua) return { browser: undefined, os: undefined };
  const browser = /Firefox\/\S+/.test(ua)
    ? "Firefox"
    : /Edg\/\S+/.test(ua)
      ? "Edge"
      : /Chrome\/\S+/.test(ua)
        ? "Chrome"
        : /Safari\/\S+/.test(ua)
          ? "Safari"
          : /curl\//.test(ua)
            ? "curl"
            : undefined;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iOS/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : undefined;
  return { browser, os };
};

const adapt = (
  s: BackendSession,
  currentUserAgent?: string,
): AuthSession => {
  const { browser, os } = parseUserAgent(s.userAgent);
  return {
    id: s.id,
    userId: s.userId,
    deviceLabel: browser ?? s.userAgent ?? undefined,
    browser,
    os,
    ipAddress: s.ipAddress ?? undefined,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActivityAt ?? s.createdAt,
    status: s.status,
    current: !!(
      currentUserAgent &&
      s.userAgent &&
      currentUserAgent === s.userAgent &&
      s.status === "ACTIVE"
    ),
  };
};

export const sessionsApi = {
  listMine: async (): Promise<AuthSession[]> => {
    const raw = await api
      .get<BackendSession[]>("/api/v1/sessions")
      .then((r) => r.data);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
    return raw.map((s) => adapt(s, ua));
  },

  revoke: (sessionId: string) =>
    api.delete<void>(`/api/v1/sessions/${sessionId}`).then((r) => r.data),

  revokeAllOthers: async () => {
    const raw = await api
      .get<BackendSession[]>("/api/v1/sessions")
      .then((r) => r.data);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
    const others = raw
      .map((s) => adapt(s, ua))
      .filter((s) => !s.current && s.status === "ACTIVE");
    await Promise.all(
      others.map((s) =>
        api.delete<void>(`/api/v1/sessions/${s.id}`).catch(() => undefined),
      ),
    );
  },
};
