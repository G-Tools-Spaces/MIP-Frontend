"use client";

import { api } from "@/lib/api/client";

export type OidcDiscovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  end_session_endpoint?: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  scopes_supported: string[];
  code_challenge_methods_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
};

export const oidcApi = {
  discovery: () =>
    api
      .get<OidcDiscovery>("/.well-known/openid-configuration")
      .then((r) => r.data),

  jwks: () =>
    api
      .get<{ keys: Array<Record<string, unknown>> }>("/.well-known/jwks.json")
      .then((r) => r.data),
};
