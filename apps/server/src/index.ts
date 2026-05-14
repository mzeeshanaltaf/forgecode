import { Hono } from "hono";
import { logger } from "hono/logger";
import { APP_NAME } from "@lightcode/shared";

const routes = new Hono()
  .use(logger())
  .get("/", (c) => c.json({ name: `${APP_NAME}-server`, status: "ok" as const }))
  .get("/health", (c) => c.json({ status: "ok" as const, uptime: process.uptime()}));

export type AppType = typeof routes;

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: routes.fetch,
};

console.log(`server listening on http://localhost:${port}`);
