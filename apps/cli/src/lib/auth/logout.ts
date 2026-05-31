import { toast } from "../toast";
import { clerkEndpoints } from "./clerk";
import { loadAuthEnv } from "./env";
import { getSession, signOut } from "./store";

/**
 * Sign out: revoke the refresh token at Clerk (RFC 7009) so it's dead
 * server-side, then clear local state. Revocation is best-effort — a network
 * failure or missing config must never leave the user stuck "signed in", so we
 * always clear locally regardless.
 */
export async function logout(): Promise<void> {
  const session = getSession();
  if (session?.refreshToken) {
    await revokeRefreshToken(session.refreshToken);
  }
  signOut();
  toast.success("Signed out");
}

async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const env = loadAuthEnv();
    const endpoints = clerkEndpoints(env.frontendApi);
    // Revoking the refresh token invalidates the whole grant (and its access
    // tokens) at Clerk. The endpoint returns 200 even for an already-invalid
    // token, so there's nothing to act on in the response.
    await fetch(endpoints.revoke, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: refreshToken,
        token_type_hint: "refresh_token",
        client_id: env.clientId,
      }),
    });
  } catch {
    // Best-effort; local sign-out proceeds either way.
  }
}
