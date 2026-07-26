/**
 * Runtime-safe environment configuration for MeiCrypt Identity Frontend.
 *
 * All public runtime values must be prefixed with NEXT_PUBLIC_.
 * Never inline secrets — the frontend uses PKCE + short-lived access tokens only.
 */

const requiredPublic = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    // Do not throw at module import in the browser — surface in a controlled way.
    if (typeof window === "undefined") {
      console.warn(`[env] Missing required env variable: ${key}`);
    }
    return "";
  }
  return value;
};

export const env = {
  /** Public MIP backend base URL (Spring Boot). */
  apiBaseUrl: requiredPublic(
    "NEXT_PUBLIC_API_BASE_URL",
    "https://mip-backend-ds5d.onrender.com",
  ),

  /** Issuer URL used for OIDC discovery. */
  issuerUrl: requiredPublic(
    "NEXT_PUBLIC_ISSUER_URL",
    "https://mip-backend-ds5d.onrender.com",
  ),

  /** Application marketing/brand name shown in chrome. */
  appName: requiredPublic("NEXT_PUBLIC_APP_NAME", "MeiCrypt Identity"),

  /** Enables dev-only affordances (query devtools, verbose logging). */
  isDev: process.env.NODE_ENV !== "production",
} as const;

export type AppEnv = typeof env;
