/**
 * PKCE (RFC 7636) primitives built on the Web Crypto API, which Bun exposes
 * globally — no dependency required. The verifier is a high-entropy random
 * string; the challenge is its base64url-encoded SHA-256 digest (the S256
 * method). `state` is an unrelated random token for CSRF protection.
 */

/** base64url-encode raw bytes (no padding, URL-safe alphabet). */
function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 32 random bytes → 43-char base64url string (within the RFC's 43–128 range). */
export function createVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** S256 challenge: base64url(SHA-256(verifier)). */
export async function challengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(new Uint8Array(digest));
}

/** Opaque random value to round-trip through the redirect for CSRF defence. */
export function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}
