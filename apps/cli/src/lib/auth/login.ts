import { toast } from "../toast";
import { openInBrowser } from "./browser";
import { waitForCallback } from "./callback-server";
import { buildAuthorizeUrl, clerkEndpoints } from "./clerk";
import { loadAuthEnv } from "./env";
import { challengeFromVerifier, createVerifier, randomState } from "./pkce";
import { setSession } from "./store";
import {
  tokenResponseSchema,
  userInfoSchema,
  type Session,
  type UserInfo,
} from "./schemas";

/**
 * Drive a full browser-based OAuth 2.0 Authorization Code + PKCE login against
 * Clerk. Fire-and-forget: the function owns its own user feedback via the
 * toast store and never throws to its caller (the `/login` command).
 *
 * Public-client flow — the token exchange sends `code_verifier` and no
 * `client_secret`.
 */
export async function login(): Promise<void> {
  let env;
  try {
    env = loadAuthEnv();
  } catch {
    toast.error("Login unavailable", {
      description: "Clerk OAuth env vars are not set.",
    });
    return;
  }

  const endpoints = clerkEndpoints(env.frontendApi);
  const verifier = createVerifier();
  const challenge = await challengeFromVerifier(verifier);
  const state = randomState();

  const callback = waitForCallback();
  try {
    const authorizeUrl = buildAuthorizeUrl({
      authorizeEndpoint: endpoints.authorize,
      clientId: env.clientId,
      redirectUri: callback.redirectUri,
      state,
      codeChallenge: challenge,
    });

    const opened = await openInBrowser(authorizeUrl);
    toast.info(opened ? "Opening browser…" : "Open this URL to sign in", {
      description: opened ? "Complete sign-in in your browser." : authorizeUrl,
      duration: opened ? undefined : 30_000,
    });

    const params = await callback.result;

    if (params.error) {
      toast.error("Sign-in cancelled", {
        description: params.error_description ?? params.error,
      });
      return;
    }
    if (params.state !== state) {
      toast.error("Login failed", { description: "State mismatch — possible CSRF." });
      return;
    }
    if (!params.code) {
      toast.error("Login failed", { description: "No authorization code returned." });
      return;
    }

    const token = await exchangeCode({
      tokenEndpoint: endpoints.token,
      clientId: env.clientId,
      code: params.code,
      redirectUri: callback.redirectUri,
      verifier,
    });

    const user = await fetchUserInfo(endpoints.userinfo, token.access_token);

    const session: Session = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: token.token_type,
      expiresAt:
        token.expires_in !== undefined
          ? Date.now() + token.expires_in * 1000
          : undefined,
      scope: token.scope,
      user: user
        ? { id: user.sub, email: user.email, name: displayName(user) }
        : undefined,
    };
    setSession(session);

    toast.success("Signed in", {
      description: session.user?.email ?? session.user?.name ?? undefined,
    });
  } catch (err) {
    toast.error("Login failed", { description: errorMessage(err) });
  } finally {
    callback.stop();
  }
}

interface ExchangeArgs {
  tokenEndpoint: string;
  clientId: string;
  code: string;
  redirectUri: string;
  verifier: string;
}

async function exchangeCode(args: ExchangeArgs) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
    client_id: args.clientId,
    code_verifier: args.verifier,
  });
  const res = await fetch(args.tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}).`);
  }
  const parsed = tokenResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("Token endpoint returned an unexpected response.");
  }
  return parsed.data;
}

/** Best-effort: userinfo enriches the toast/session but its failure isn't fatal. */
async function fetchUserInfo(
  endpoint: string,
  accessToken: string,
): Promise<UserInfo | null> {
  try {
    const res = await fetch(endpoint, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return null;
    const parsed = userInfoSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function displayName(user: UserInfo): string | undefined {
  if (user.name) return user.name;
  const full = [user.given_name, user.family_name].filter(Boolean).join(" ");
  return full || user.username || undefined;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unexpected error.";
}
