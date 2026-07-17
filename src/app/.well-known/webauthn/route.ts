/**
 * WebAuthn "Related Origin Requests" discovery document.
 *
 * The browser fetches `https://<rpId>/.well-known/webauthn` when it needs to
 * validate that the Relying Party ID (`rp.id`) advertised in a WebAuthn
 * ceremony is legitimate for the current origin. The response MUST:
 *   - be served with `Content-Type: application/json`
 *   - be a JSON object with an `origins` array of full origins (scheme://host[:port])
 *
 * Spec: https://w3c.github.io/webauthn/#sctn-related-origins
 *
 * NOTE: The RP ID for local dev is `localhost` (see backend
 * `meicrypt.mfa.relying-party-id`). Both the frontend (http://localhost:3000)
 * and the backend (http://localhost:8080) are on the `localhost` registrable
 * domain so the browser normally accepts the RP ID without hitting this URL.
 * We still expose it so strict browsers (or non-localhost deployments) can
 * resolve related origins and don't blow up with the
 * "wrong content-type / application/json" error the user was seeing.
 */
import { NextResponse } from "next/server";

// Explicit runtime + caching hints so this handler is always dynamic JSON.
export const runtime = "nodejs";
export const dynamic = "force-static";

type WebAuthnDiscoveryDocument = {
  origins: string[];
};

function readEnvOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGINS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function defaultOrigins(): string[] {
  // Include both the frontend and backend local dev origins by default so
  // that either side can serve as the WebAuthn "origin" during ceremonies.
  const fromEnv: string[] = [];
  const publicApi = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (publicApi) fromEnv.push(publicApi.replace(/\/$/, ""));

  const publicIssuer = process.env.NEXT_PUBLIC_ISSUER_URL;
  if (publicIssuer) fromEnv.push(publicIssuer.replace(/\/$/, ""));

  return Array.from(
    new Set([
      "http://localhost:3000",
      "http://localhost:8080",
      ...fromEnv,
    ]),
  );
}

export async function GET() {
  const configured = readEnvOrigins();
  const origins = configured.length > 0 ? configured : defaultOrigins();

  const body: WebAuthnDiscoveryDocument = { origins };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // Explicit — some infra/proxy strips the default from NextResponse.json.
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
