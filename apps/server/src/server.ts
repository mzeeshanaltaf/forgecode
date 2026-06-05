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
// The Node runtime accepts a Web-standard handler, which is exactly Hono's
// `app.fetch`. `vercel.json` rewrites every path here, so Hono still sees the
// original `/sessions/*` and `/payments/*` paths.
export default (request: Request): Response | Promise<Response> => app.fetch(request);
