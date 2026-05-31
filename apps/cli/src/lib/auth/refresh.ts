import { clerkEndpoints } from "./clerk";
import { loadAuthEnv } from "./env";
import { tokenResponseSchema, type Session } from "./schemas";
import { getSession, setSession, signOut } from "./store";

/** Refresh slightly before expiry so a token never lapses mid-request. */
const EXPIRY_SKEW_MS = 60_000;

let inFlight: Promise<Session | null> | null = null;

/**
 * Exchange the stored refresh token for a fresh access token (and a rotated
 * refresh token, if Clerk returns one). Resolves to the new session, or `null`
 * when there's nothing to refresh or the refresh token was rejected — in which
 * case the session is cleared and the user must `/login` again.
 *
 * Concurrent callers share a single in-flight request so we never fire two
 * refreshes for the same token (which would invalidate one via rotation).
 */
export function refreshSession(): Promise<Session | null> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(): Promise<Session | null> {
  const session = getSession();
  if (!session?.refreshToken) return null;

  const env = loadAuthEnv();
  const endpoints = clerkEndpoints(env.frontendApi);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
    client_id: env.clientId,
  });

  const res = await fetch(endpoints.token, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    // 4xx → the refresh token is invalid/expired/revoked, so the session is
    // dead; drop it so the UI shows signed-out. 5xx is transient — keep it.
    if (res.status >= 400 && res.status < 500) signOut();
    return null;
  }

  const parsed = tokenResponseSchema.safeParse(await res.json());
  if (!parsed.success) return null;
  const token = parsed.data;

  const next: Session = {
    accessToken: token.access_token,
    // Clerk rotates refresh tokens; reuse the old one only if none came back.
    refreshToken: token.refresh_token ?? session.refreshToken,
    tokenType: token.token_type ?? session.tokenType,
    expiresAt:
      token.expires_in !== undefined
        ? Date.now() + token.expires_in * 1000
        : undefined,
    scope: token.scope ?? session.scope,
    user: session.user,
  };
  setSession(next);
  return next;
}

/**
 * Return a usable (non-expired) access token, transparently refreshing first if
 * the stored one is at or near expiry. Resolves to `null` when signed out or
 * when no refresh is possible — callers should then prompt the user to `/login`.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;

  const expiringSoon =
    session.expiresAt !== undefined &&
    Date.now() >= session.expiresAt - EXPIRY_SKEW_MS;
  if (!expiringSoon) return session.accessToken;

  if (!session.refreshToken) return null;
  const refreshed = await refreshSession();
  return refreshed?.accessToken ?? null;
}
