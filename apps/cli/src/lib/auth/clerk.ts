/**
 * Clerk's OAuth endpoints all hang off the Frontend API base. Rather than
 * configuring five separate URLs, we derive them from the one base we have
 * (`CLERK_FRONTEND_API`). Paths match Clerk's hosted OAuth provider:
 *
 *   <base>/oauth/authorize
 *   <base>/oauth/token
 *   <base>/oauth/userinfo
 *   <base>/.well-known/openid-configuration
 */
export interface ClerkEndpoints {
  authorize: string;
  token: string;
  userinfo: string;
  revoke: string;
  introspect: string;
  discovery: string;
}

export function clerkEndpoints(frontendApi: string): ClerkEndpoints {
  const base = frontendApi.replace(/\/+$/, "");
  return {
    authorize: `${base}/oauth/authorize`,
    token: `${base}/oauth/token`,
    userinfo: `${base}/oauth/userinfo`,
    revoke: `${base}/oauth/token/revoke`,
    introspect: `${base}/oauth/token_info`,
    discovery: `${base}/.well-known/openid-configuration`,
  };
}

export interface AuthorizeUrlParams {
  authorizeEndpoint: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
  /**
   * OIDC `prompt`. Defaults to `"login"` so Clerk always re-authenticates
   * rather than silently reusing the existing session — otherwise every
   * subsequent login is bound to the first account with no way to switch.
   */
  prompt?: string;
}

/** Build the full `/oauth/authorize` URL for an Authorization Code + PKCE flow. */
export function buildAuthorizeUrl(params: AuthorizeUrlParams): string {
  const url = new URL(params.authorizeEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  // `offline_access` is what makes Clerk issue a refresh token.
  url.searchParams.set("scope", params.scope ?? "openid profile email offline_access");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", params.prompt ?? "login");
  return url.toString();
}
