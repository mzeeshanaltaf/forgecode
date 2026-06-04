import { callbackParamsSchema, type CallbackParams } from "./schemas";

/**
 * A throwaway loopback HTTP server that catches Clerk's OAuth redirect.
 *
 * The browser is sent to `redirectUri`; the first GET to the callback path
 * resolves `result` with the parsed query params, after which the server can
 * be torn down. We pin a fixed loopback port so the exact redirect URI can be
 * registered in the Clerk dashboard (Clerk does not allow wildcard ports).
 */

/** Default loopback port for the redirect URI — must be registered in Clerk. */
export const DEFAULT_CALLBACK_PORT = 52125;
const DEFAULT_CALLBACK_PATH = "/callback";
const DEFAULT_TIMEOUT_MS = 120_000;

export interface CallbackHandle {
  /** The `redirect_uri` to hand to the authorize endpoint. */
  redirectUri: string;
  /** Resolves with the callback query params, or rejects on timeout. */
  result: Promise<CallbackParams>;
  /** Stop the server and cancel the timeout. Safe to call more than once. */
  stop: () => void;
}

export interface CallbackOptions {
  port?: number;
  path?: string;
  timeoutMs?: number;
}

const SUCCESS_HTML = `<!doctype html><meta charset="utf-8"><title>ForgeCode</title>
<body style="font-family:system-ui;background:#0d1117;color:#c9d1d9;display:flex;height:100vh;margin:0;align-items:center;justify-content:center">
<div style="text-align:center"><h1 style="font-weight:600">You're signed in</h1>
<p style="color:#8b949e">You can close this tab and return to ForgeCode.</p></div>`;

export function waitForCallback(options: CallbackOptions = {}): CallbackHandle {
  const port = options.port ?? DEFAULT_CALLBACK_PORT;
  const path = options.path ?? DEFAULT_CALLBACK_PATH;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let settle!: (params: CallbackParams) => void;
  let fail!: (err: Error) => void;
  const result = new Promise<CallbackParams>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });

  const server = Bun.serve({
    port,
    hostname: "127.0.0.1",
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname !== path) {
        return new Response("Not found", { status: 404 });
      }
      const parsed = callbackParamsSchema.safeParse(
        Object.fromEntries(url.searchParams),
      );
      if (parsed.success) settle(parsed.data);
      else fail(new Error("Malformed OAuth callback."));
      return new Response(SUCCESS_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  });

  const timer = setTimeout(() => {
    fail(new Error("Timed out waiting for sign-in."));
  }, timeoutMs);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    server.stop(true);
  };

  return {
    redirectUri: `http://127.0.0.1:${port}${path}`,
    result,
    stop,
  };
}
