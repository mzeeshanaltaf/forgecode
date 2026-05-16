import { Hono } from "hono";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { chatRequestSchema } from "@lightcode/shared";

export const chatRoute = new Hono().post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid request", issues: parsed.error.issues }, 400);
  }
  const result = streamText({
    model: openai("gpt-5-mini"),
    messages: await convertToModelMessages(parsed.data.messages as UIMessage[]),
    providerOptions: {
      openai: { reasoningSummary: "auto" },
    },
    tools: {
      getCurrentTime: tool<{ timezone?: string }, { now: string }>({
        description: "Get the current server time as an ISO string.",
        inputSchema: z.object({
          timezone: z
            .string()
            .optional()
            .describe("IANA timezone name; ignored, always returns UTC."),
        }),
        execute: async () => ({ now: new Date().toISOString() }),
      }),
      alwaysFails: tool<{ reason: string }, { ok: false }>({
        description:
          "Diagnostic tool that always throws. Call this to test error-state rendering.",
        inputSchema: z.object({
          reason: z.string().describe("Why you are testing the failure path."),
        }),
        execute: async (): Promise<{ ok: false }> => {
          throw new Error("intentional failure for tool-error rendering");
        },
      }),
    },
    stopWhen: stepCountIs(4),
  });
  return result.toUIMessageStreamResponse({ sendReasoning: true });
});
