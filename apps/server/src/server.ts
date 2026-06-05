import type { IncomingMessage, ServerResponse } from "node:http";
import { handle } from "@hono/node-server/vercel";
import { app } from "./app";

/** Vercel augments the Node request with its parsed body (and sometimes rawBody). */
type VercelRequest = IncomingMessage & { body?: unknown; rawBody?: Buffer };

// Bundle entry for the Vercel serverless function. Bun bundles this (and the
// whole TypeScript graph it pulls in — routes, the `@forgecode/*` workspace
// packages, and the generated Prisma client) into a single Node-compatible
// `.mjs`, because Vercel's Node runtime can't execute raw TypeScript or resolve
// the extensionless / `.ts` imports that Bun handles natively in dev.
//
// `pg` and `@prisma/*` stay external (see the build command in vercel.json) and
// load from node_modules at runtime, so Vercel's file tracer ships them — and
// the Prisma runtime's assets — alongside the function.
//
// Adapts Hono to Vercel's Node `(req, res)` signature: builds a Web Request from
// the IncomingMessage, runs `app.fetch`, and writes the Response (including
// streamed bodies) back to `res`. Exporting `app.fetch` directly does NOT work —
// Vercel calls the function as `(req, res)`, so a returned Response is ignored
// and the request hangs forever. `vercel.json` rewrites every path here, so Hono
// still sees the original `/sessions/*` paths.
const listener = handle(app);

// Vercel's Node runtime parses JSON/text request bodies onto `req.body` and
// consumes the underlying stream in doing so. The adapter then tries to read
// that drained stream to build the web Request body, which never completes — so
// `c.req.json()` hangs until the function times out (every POST with a body).
// Re-materialise the parsed body as `req.rawBody`, which the adapter prefers
// over the stream, so Hono reads it immediately. (GET/HEAD have no body; if
// Vercel left a real stream untouched, we leave it for the adapter.)
export default function handler(req: VercelRequest, res: ServerResponse) {
  const method = (req.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && !(req.rawBody instanceof Buffer) && req.body != null) {
    req.rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === "string"
        ? Buffer.from(req.body)
        : Buffer.from(JSON.stringify(req.body));
  }
  return listener(req, res);
}
