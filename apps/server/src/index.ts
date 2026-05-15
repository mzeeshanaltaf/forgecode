import { Hono } from "hono";
import { logger } from "hono/logger";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { APP_NAME, generateRequestSchema } from "@lightcode/shared";

const routes = new Hono()
  .use(logger())
  .get("/", (c) => c.json({ name: `${APP_NAME}-server`, status: "ok" as const }))
  .get("/health", (c) => c.json({ status: "ok" as const, uptime: process.uptime() }))
  .post("/generate", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = generateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid request", issues: parsed.error.issues }, 400);
    }
    const result = streamText({
      model: openai("gpt-5-mini"),
      prompt: parsed.data.prompt,
    });
    return result.toTextStreamResponse();
  });

export type AppType = typeof routes;

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: routes.fetch,
};

console.log(`server listening on http://localhost:${port}`);
