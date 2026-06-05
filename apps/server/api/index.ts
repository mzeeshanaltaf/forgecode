import { app } from "../src/app";

// Vercel serverless entry. The Node.js runtime (the default for non-Next
// projects) accepts a Web-standard handler — `(Request) => Response` — which is
// exactly what Hono's `app.fetch` is. The Node runtime is required because the
// routes use Prisma + `pg`, which can't run on the Edge runtime.
//
// `vercel.json` rewrites every path to this function, so Hono still sees the
// original `/sessions/*` and `/payments/*` paths.
export default (request: Request): Response | Promise<Response> => app.fetch(request);
