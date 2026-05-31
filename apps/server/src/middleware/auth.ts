import { createMiddleware } from "hono/factory";
import { TokenType, verifyMachineAuthToken } from "@clerk/backend/internal";

/**
 * The verified OAuth access token, as returned by Clerk's Backend API. Its
 * `subject` is the authenticated Clerk user id; `clientId`/`scopes` describe
 * the OAuth grant the CLI logged in under.
 */
type OAuthToken = Extract<
  Awaited<ReturnType<typeof verifyMachineAuthToken>>,
  { errors?: undefined }
>["data"];

/**
 * `Env` for any Hono app/route that mounts {@link clerkAuth}. Merge this into
 * a route's generic so `c.get("auth")` / `c.get("userId")` stay typed:
 *
 *   new Hono<AuthEnv>().use(clerkAuth).get("/", (c) => c.json(c.get("userId")))
 */
export type AuthEnv = {
  Variables: {
    auth: OAuthToken;
    userId: string;
  };
};

/**
 * Validates the `Authorization: Bearer <token>` header against Clerk and, on
 * success, exposes the verified token (and the user id via `c.get("userId")`).
 * Responds `401` otherwise.
 *
 * The CLI signs in through Clerk's OAuth provider (Authorization Code + PKCE)
 * and sends the resulting **OAuth access token** (`oat_…`), not a session JWT —
 * so we verify with `verifyMachineAuthToken`, which checks the token against
 * Clerk's Backend API and reports revocation/expiry. This is the server-side
 * counterpart to the CLI's `/oauth/token_info` introspection in `whoami`, but
 * authenticated with `CLERK_SECRET_KEY` instead of the OAuth client secret.
 */
export const clerkAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("CLERK_SECRET_KEY is not set — cannot verify auth tokens");
    return c.json({ error: "auth not configured" }, 500);
  }

  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return c.json({ error: "missing bearer token" }, 401);
  }

  const { data, tokenType, errors } = await verifyMachineAuthToken(token, {
    secretKey,
  });
  // Only an OAuth access token carries an end-user identity; reject any other
  // machine token (API key, M2M) even if it verifies against this instance.
  if (errors || tokenType !== TokenType.OAuthToken) {
    return c.json({ error: "invalid or expired token" }, 401);
  }
  if (data.revoked || data.expired) {
    return c.json({ error: "invalid or expired token" }, 401);
  }

  c.set("auth", data);
  c.set("userId", data.subject);
  await next();
});
