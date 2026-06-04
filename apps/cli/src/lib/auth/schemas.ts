import { z } from "zod";

/**
 * Runtime schemas for every payload crossing an auth boundary: the OAuth
 * callback query params, the token endpoint response, Clerk's userinfo, and
 * the session we persist to disk. Per the repo convention, parse at the
 * boundary and derive types via {@link z.infer} — never `as`-cast.
 */

/** Query params Clerk appends to the loopback redirect. */
export const callbackParamsSchema = z
  .object({
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
    error_description: z.string().optional(),
  })
  .passthrough();
export type CallbackParams = z.infer<typeof callbackParamsSchema>;

/** Successful response from `POST /oauth/token`. */
export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
});
export type TokenResponse = z.infer<typeof tokenResponseSchema>;

/** Subset of `GET /oauth/userinfo` we care about. Best-effort, all optional. */
export const userInfoSchema = z
  .object({
    sub: z.string().optional(),
    email: z.string().optional(),
    email_verified: z.boolean().optional(),
    name: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    username: z.string().optional(),
    picture: z.string().optional(),
  })
  .passthrough();
export type UserInfo = z.infer<typeof userInfoSchema>;

/** Response from the token introspection endpoint (`/oauth/token_info`, RFC 7662). */
export const introspectionResultSchema = z
  .object({
    active: z.boolean(),
    /** Expiry as Unix seconds, present only for an active token. */
    exp: z.number().optional(),
    iat: z.number().optional(),
    scope: z.string().optional(),
    sub: z.string().optional(),
    token_type: z.string().optional(),
    client_id: z.string().optional(),
  })
  .passthrough();
export type IntrospectionResult = z.infer<typeof introspectionResultSchema>;

/** What we persist to `~/.forgecode/auth.json`. */
export const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenType: z.string().optional(),
  /** Epoch milliseconds when the access token expires, if known. */
  expiresAt: z.number().optional(),
  scope: z.string().optional(),
  user: z
    .object({
      id: z.string().optional(),
      email: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});
export type Session = z.infer<typeof sessionSchema>;
