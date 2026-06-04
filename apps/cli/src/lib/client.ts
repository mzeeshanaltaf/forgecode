import { hc } from "hono/client";
import type { AppType } from "server";
import { getValidAccessToken } from "./auth";

const baseUrl = process.env.FORGECODE_SERVER_URL ?? "http://localhost:3000/";

/**
 * Resolved per request: a (auto-refreshed) bearer header when signed in, or no
 * auth header at all when signed out. `getValidAccessToken` refreshes
 * transparently if the access token is at/near expiry, so long-lived sessions
 * survive without re-running `/login`.
 *
 * Exported so non-RPC callers that bypass `client` — notably the AI SDK chat
 * transport, which fetches the streaming endpoint directly — can authenticate
 * with the exact same logic.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

export const client = hc<AppType>(baseUrl, { headers: authHeaders });
export type Client = typeof client;
