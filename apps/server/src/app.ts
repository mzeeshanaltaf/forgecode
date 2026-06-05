import { Hono } from "hono";
import { logger } from "hono/logger";
import { sessionsRoute } from "./routes/sessions";
import { paymentsRoute } from "./routes/payments";

// The Hono app instance. Imported by `index.ts` (Bun local dev) and by
// `api/index.ts` (the Vercel serverless function). Keep the chained form so
// `typeof app` carries every route into `AppType` for the RPC client.
export const app = new Hono()
  .use(logger())
  .route("/sessions", sessionsRoute)
  .route("/payments", paymentsRoute);

export type AppType = typeof app;
