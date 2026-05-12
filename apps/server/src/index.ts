import { Hono } from "hono";
import { logger } from "hono/logger";
import { APP_NAME } from "@lightcode/shared";

const app = new Hono();

app.use(logger());

app.get("/", (c) => c.json({ name: `${APP_NAME}-server`, status: "ok" }));

app.get("/health", (c) => c.json({ status: "ok", uptime: process.uptime() }));

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};

console.log(`server listening on http://localhost:${port}`);
