import { Hono } from "hono";
import { logger } from "hono/logger";
import { sessionsRoute } from "./routes/sessions";
import { paymentsRoute } from "./routes/payments";

// The Hono app instance. Imported by `index.ts` (Bun local dev) and by
// `api/index.ts` (the Vercel serverless function). Keep the chained form so
// `typeof app` carries every route into `AppType` for the RPC client.
export const app = new Hono()
  .use(logger())
  // Browsers hitting the bare deploy URL auto-request these; answer them so
  // they don't fall through to a noisy 404 in the Vercel logs.
  .get("/", (c) => c.text("ok"))
  .get("/favicon.ico", (c) => c.body(null, 204))
  .get("/favicon.png", (c) => c.body(null, 204))
  .route("/sessions", sessionsRoute)
  .route("/payments", paymentsRoute);

export type AppType = typeof app;
