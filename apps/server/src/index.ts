import { Hono } from "hono";
import { logger } from "hono/logger";
import { sessionsRoute } from "./routes/sessions";

const routes = new Hono().use(logger()).route("/sessions", sessionsRoute);

export type AppType = typeof routes;

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: routes.fetch,
};

console.log(`server listening on http://localhost:${port}`);
