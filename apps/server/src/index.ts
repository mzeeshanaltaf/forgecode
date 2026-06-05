import { app } from "./app";

// Re-exported so the CLI's RPC client (`import type { AppType } from "server"`)
// keeps resolving through the package's `main`.
export type { AppType } from "./app";

// Bun local-dev entry: Bun's runtime recognises this default-export shape and
// starts the HTTP server. On Vercel this module isn't the entry point —
// `api/index.ts` is — so this server never starts there.
const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};

console.log(`server listening on http://localhost:${port}`);
