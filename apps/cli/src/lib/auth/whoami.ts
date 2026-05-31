import { format, formatDistanceToNow } from "date-fns";
import { toast } from "../toast";
import { clerkEndpoints } from "./clerk";
import { clientSecret, loadAuthEnv } from "./env";
import { introspectionResultSchema, type IntrospectionResult } from "./schemas";
import { getSession } from "./store";

/**
 * Report the current identity and token status. Introspects the long-lived
 * refresh token (or the access token if there's no refresh token) at Clerk's
 * `/oauth/token_info` endpoint to surface whether the session is still `active`
 * and, for an active token, its real `exp` — answering "who am I and until when"
 * without leaving the TUI.
 */
export async function whoami(): Promise<void> {
  const session = getSession();
  if (!session) {
    toast.info("Not signed in", { description: "Run /login to sign in." });
    return;
  }

  const who =
    session.user?.email ?? session.user?.name ?? session.user?.id ?? "unknown account";

  // The refresh token is the session's outer bound; fall back to the access
  // token when offline_access wasn't granted.
  const token = session.refreshToken ?? session.accessToken;
  const hint = session.refreshToken ? "refresh_token" : "access_token";

  let info: IntrospectionResult | null = null;
  try {
    info = await introspect(token, hint);
  } catch {
    // Network or config failure — fall back to what we know locally.
    toast.info(`Signed in as ${who}`, { description: localExpiry(session.expiresAt) });
    return;
  }

  if (!info || !info.active) {
    toast.warning("Session inactive", {
      description: `${who} — token is expired or revoked. Run /login.`,
    });
    return;
  }

  const kind = hint === "refresh_token" ? "Refresh token" : "Access token";
  let description: string;
  if (info.exp) {
    // The introspected token advertises an absolute expiry.
    description = `${kind} active · expires ${formatExp(info.exp)}`;
  } else if (session.expiresAt !== undefined) {
    // Clerk doesn't expose an expiry for refresh tokens (they're long-lived and
    // rotate), so fall back to the access token's expiry, which we know locally.
    description = `${kind} active · access token expires ${formatExp(
      Math.floor(session.expiresAt / 1000),
    )}`;
  } else {
    description = `${kind} active · no expiry reported`;
  }
  toast.success(`Signed in as ${who}`, { description });
}

async function introspect(
  token: string,
  hint: string,
): Promise<IntrospectionResult | null> {
  const env = loadAuthEnv();
  // Clerk's introspection endpoint requires `client_secret_basic` — the secret
  // in an HTTP Basic header, not the request body (the body form returns 401).
  // The PKCE login/refresh flows are public and never need it, but this one
  // does, so without a configured secret we can't introspect.
  const secret = clientSecret();
  if (!secret) {
    throw new Error("Introspection requires CLERK_OAUTH_CLIENT_SECRET.");
  }
  const endpoints = clerkEndpoints(env.frontendApi);

  const res = await fetch(endpoints.introspect, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      authorization: `Basic ${btoa(`${env.clientId}:${secret}`)}`,
    },
    body: new URLSearchParams({ token, token_type_hint: hint }),
  });
  if (!res.ok) throw new Error(`Introspection failed (${res.status}).`);
  const parsed = introspectionResultSchema.safeParse(await res.json());
  return parsed.success ? parsed.data : null;
}

/** Human-readable expiry from a Unix-seconds timestamp. */
function formatExp(expSeconds: number): string {
  const date = new Date(expSeconds * 1000);
  return `${formatDistanceToNow(date, { addSuffix: true })} (${format(date, "yyyy-MM-dd HH:mm")})`;
}

/** Fallback line built from the locally-stored access-token expiry. */
function localExpiry(expiresAt?: number): string {
  if (expiresAt === undefined) return "Token status unavailable.";
  return `Access token expires ${formatExp(Math.floor(expiresAt / 1000))}`;
}
