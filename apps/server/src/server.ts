import { handle } from "@hono/node-server/vercel";
import { app } from "./app";

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
export default handle(app);
