import { z } from "zod";

/**
 * Clerk OAuth configuration the CLI needs to drive a PKCE flow. These come from
 * `process.env` — the `dev:cli` script loads them via `--env-file=apps/server/.env`.
 * We validate at the boundary so a missing/blank var surfaces as a clear error
 * (caught by the login flow and shown as a toast) rather than a malformed URL.
 */
const authEnvSchema = z.object({
  /** e.g. `https://adapted-rattler-83.clerk.accounts.dev` */
  CLERK_FRONTEND_API: z.string().min(1).url(),
  CLERK_OAUTH_CLIENT_ID: z.string().min(1),
});

export interface AuthEnv {
  frontendApi: string;
  clientId: string;
}

/**
 * Read and validate the Clerk OAuth env. Throws if anything is missing so the
 * caller can report it; never returns a partially-filled config.
 */
export function loadAuthEnv(): AuthEnv {
  const parsed = authEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      "Clerk OAuth env vars are not set (CLERK_FRONTEND_API, CLERK_OAUTH_CLIENT_ID).",
    );
  }
  // Normalise: strip any trailing slash so URL construction is predictable.
  return {
    frontendApi: parsed.data.CLERK_FRONTEND_API.replace(/\/+$/, ""),
    clientId: parsed.data.CLERK_OAUTH_CLIENT_ID,
  };
}

/**
 * Optional client secret. The PKCE login/refresh flows are public and never use
 * it, but the introspection endpoint may require client authentication, so we
 * include it there when present. Returns `undefined` when unset/blank.
 */
export function clientSecret(): string | undefined {
  const value = process.env.CLERK_OAUTH_CLIENT_SECRET;
  return value && value.length > 0 ? value : undefined;
}
