"use client";

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/env";
import { tokenStore } from "@/lib/auth/token-store";
import { ApiError, isProblemDetails } from "./problem";

/**
 * Central Axios instance for MIP backend calls.
 *
 * Responsibilities:
 * - Inject the Bearer access token from tokenStore.
 * - Inject the X-Organization-Slug header when a tenant is active.
 * - Transform every non-2xx response into an ApiError containing the
 *   RFC 7807 ProblemDetails payload for uniform UI handling.
 * - Attempt a single silent refresh on 401 before propagating the failure.
 */

let refreshPromise: Promise<void> | null = null;

const performRefresh = async (): Promise<void> => {
  // The MIP backend stores the refresh token in an HttpOnly cookie set at
  // /api/v1/auth/login. A POST to /api/v1/auth/refresh will rotate the
  // refresh token and return a new access token.
  const response = await axios.post<{
    accessToken: string;
    tokenType: "Bearer";
    expiresIn: number;
    orgSlug?: string;
  }>(
    `${env.apiBaseUrl}/api/v1/auth/refresh`,
    {},
    { withCredentials: true },
  );

  const now = Date.now();
  tokenStore.set({
    accessToken: response.data.accessToken,
    tokenType: "Bearer",
    expiresAt: now + response.data.expiresIn * 1000,
    orgSlug: response.data.orgSlug,
  });
};

const ensureRefresh = (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const attachAuth = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  const snap = tokenStore.get();
  if (snap && !tokenStore.isExpired()) {
    config.headers.set("Authorization", `${snap.tokenType} ${snap.accessToken}`);
  }
  if (snap?.orgSlug) {
    config.headers.set("X-Organization-Slug", snap.orgSlug);
  }
  return config;
};

const createClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: env.apiBaseUrl,
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 20_000,
  });

  instance.interceptors.request.use(attachAuth);

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as
        | (InternalAxiosRequestConfig & { _retried?: boolean })
        | undefined;

      // Attempt single silent refresh on 401 for authenticated requests only.
      //
      // We deliberately DO NOT clear the token store if the refresh itself
      // fails. The backend's /api/v1/auth/refresh expects the refresh token
      // in the JSON body (not a cookie), and the SPA currently has no way
      // to supply it — so a refresh 4xx is expected and must not nuke the
      // just-issued access token. The caller will surface a real 401 and
      // the auth guard will handle sign-out explicitly.
      if (
        error.response?.status === 401 &&
        original &&
        !original._retried &&
        !original.url?.includes("/api/v1/auth/")
      ) {
        original._retried = true;
        try {
          await ensureRefresh();
          return instance.request(original);
        } catch {
          // swallow — see comment above
        }
      }

      const data = error.response?.data;
      if (isProblemDetails(data)) {
        return Promise.reject(new ApiError(data));
      }

      return Promise.reject(
        new ApiError({
          title: error.message || "Network error",
          status: error.response?.status ?? 0,
          detail:
            typeof data === "string"
              ? data
              : "Unable to reach the MeiCrypt Identity service.",
        }),
      );
    },
  );

  return instance;
};

export const api = createClient();
