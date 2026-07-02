/**
 * In-memory + sessionStorage token store.
 *
 * Design notes:
 * - The access token is held in memory (module scope) for fast access.
 * - A short-lived mirror is kept in sessionStorage so a hard refresh does not
 *   log the user out during a browsing session.
 * - Refresh tokens are NEVER stored on the client — they live in an
 *   HttpOnly cookie set by the Spring backend.
 */

export type TokenSnapshot = {
  accessToken: string;
  /** Epoch milliseconds when this access token expires. */
  expiresAt: number;
  /** Token type — always "Bearer" for MIP. */
  tokenType: "Bearer";
  /** Organization slug this token is bound to (multi-tenancy). */
  orgSlug?: string;
  /** Organization UUID this token is bound to. Persisted so a hard refresh
   *  keeps the console's org-scoped queries working without re-login. */
  organizationId?: string;
  /** Lightweight profile snapshot to hydrate the UI after a refresh. */
  user?: {
    id: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    membershipId?: string;
  };
};

const STORAGE_KEY = "mip.session";

let current: TokenSnapshot | null = null;
const listeners = new Set<(snap: TokenSnapshot | null) => void>();

const isBrowser = typeof window !== "undefined";

const hydrate = (): TokenSnapshot | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenSnapshot;
    if (parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
};

const persist = (snap: TokenSnapshot | null): void => {
  if (!isBrowser) return;
  if (snap) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
};

export const tokenStore = {
  get(): TokenSnapshot | null {
    if (!isBrowser) return null;
    if (current) return current;
    current = hydrate();
    return current;
  },
  set(snap: TokenSnapshot | null): void {
    current = snap;
    persist(snap);
    listeners.forEach((cb) => cb(snap));
  },
  clear(): void {
    this.set(null);
  },
  isExpired(): boolean {
    const snap = this.get();
    if (!snap) return true;
    // Consider expired 15 seconds before actual expiry to allow refresh.
    return snap.expiresAt - 15_000 < Date.now();
  },
  subscribe(cb: (snap: TokenSnapshot | null) => void): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};
