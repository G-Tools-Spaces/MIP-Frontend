/**
 * PKCE (RFC 7636) helpers for the OAuth2 authorization_code flow.
 *
 * The MIP backend requires PKCE for every /oauth2/authorize call (Phase 6.1).
 */

const encoder = new TextEncoder();

const base64UrlEncode = (bytes: ArrayBufferLike): string => {
  const uint = new Uint8Array(bytes);
  let str = "";
  for (let i = 0; i < uint.byteLength; i += 1) {
    str += String.fromCharCode(uint[i]);
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const randomBytes = (length: number): Uint8Array => {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
};

export const generateCodeVerifier = (): string => {
  // 32 bytes → 43 chars base64url — comfortably within RFC7636's 43–128 range.
  const bytes = randomBytes(32);
  return base64UrlEncode(bytes.buffer);
};

export const generateCodeChallenge = async (
  verifier: string,
): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(verifier),
  );
  return base64UrlEncode(digest);
};

export const generateState = (): string =>
  base64UrlEncode(randomBytes(16).buffer);
