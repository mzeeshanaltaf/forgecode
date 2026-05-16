import { Hono } from "hono";
import { logger } from "hono/logger";
import { chatRoute } from "./routes/chat";

const routes = new Hono().use(logger()).route("/chat", chatRoute);

export type AppType = typeof routes;

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: routes.fetch,
};

console.log(`server listening on http://localhost:${port}`);
