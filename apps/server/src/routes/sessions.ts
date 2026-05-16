import { Hono } from "hono";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  generateId,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
  type UIMessagePart,
} from "ai";
import { z } from "zod";
import { postMessageRequestSchema } from "@lightcode/shared";
import { prisma } from "../db";
import { MessageRole, type Prisma } from "../../generated/client";

const MODEL_ID = "gpt-5-mini";

const SERVICE_TIER = z
  .enum(["default", "auto", "flex", "priority"])
  .optional()
  .parse(process.env.OPENAI_SERVICE_TIER || undefined);

type StoredPart = UIMessagePart<Record<string, unknown>, Record<string, never>>;

type ToolPartRow = {
  toolCallId: string;
  toolName: string;
  state: string;
  input: Prisma.InputJsonValue | undefined;
  output: Prisma.InputJsonValue | undefined;
  errorText: string | null;
  providerExecuted: boolean;
};

function extractToolRows(parts: readonly StoredPart[]): ToolPartRow[] {
  const rows: ToolPartRow[] = [];
  for (const part of parts) {
    const isDynamic = part.type === "dynamic-tool";
    const isStatic = part.type.startsWith("tool-");
    if (!isDynamic && !isStatic) continue;
    const p = part as unknown as {
      type: string;
      toolName?: string;
      toolCallId?: string;
      state?: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
      providerExecuted?: boolean;
    };
    if (!p.toolCallId || !p.state) continue;
    const toolName = isDynamic ? p.toolName ?? "unknown" : part.type.slice(5);
    rows.push({
      toolCallId: p.toolCallId,
      toolName,
      state: p.state,
      input: p.input === undefined ? undefined : (p.input as Prisma.InputJsonValue),
      output: p.output === undefined ? undefined : (p.output as Prisma.InputJsonValue),
      errorText: p.errorText ?? null,
      providerExecuted: p.providerExecuted ?? false,
    });
  }
  return rows;
}

function roleOf(role: string): MessageRole {
  switch (role) {
    case "user":
      return MessageRole.user;
    case "assistant":
      return MessageRole.assistant;
    case "system":
      return MessageRole.system;
    default:
      throw new Error(`unsupported role: ${role}`);
  }
}

export const sessionsRoute = new Hono()
  .post("/", async (c) => {
    const session = await prisma.session.create({ data: {} });
    return c.json({ id: session.id });
  })
  .get("/:id/messages", async (c) => {
    const id = c.req.param("id");
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return c.json({ error: "session not found" }, 404);
    }
    const rows = await prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "asc" },
    });
    const messages = rows.map((row) => ({
      id: row.clientId,
      role: row.role,
      parts: row.parts,
    }));
    return c.json({ messages });
  })
  .post("/:id/messages", async (c) => {
    const id = c.req.param("id");
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return c.json({ error: "session not found" }, 404);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = postMessageRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid request", issues: parsed.error.issues }, 400);
    }

    const incoming = parsed.data.message as UIMessage;
    await prisma.message.create({
      data: {
        sessionId: id,
        clientId: incoming.id,
        role: roleOf(incoming.role),
        parts: incoming.parts as unknown as Prisma.InputJsonValue,
      },
    });

    const historyRows = await prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "asc" },
    });
    const history: UIMessage[] = historyRows.map((row) => ({
      id: row.clientId,
      role: row.role,
      parts: row.parts as unknown as UIMessage["parts"],
    }));

    const result = streamText({
      model: openai(MODEL_ID),
      messages: await convertToModelMessages(history),
      providerOptions: {
        openai: { reasoningSummary: "auto", serviceTier: SERVICE_TIER },
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
      onError: ({ error }) => {
        const err = error instanceof Error ? error : new Error(String(error));
        void prisma.sessionError
          .create({
            data: {
              sessionId: id,
              message: err.message,
              stack: err.stack ?? null,
            },
          })
          .catch((dbErr) => {
            console.error("failed to persist session error", dbErr);
          });
      },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: history,
      generateMessageId: generateId,
      onFinish: async ({ responseMessage }) => {
        try {
          const created = await prisma.message.create({
            data: {
              sessionId: id,
              clientId: responseMessage.id,
              role: roleOf(responseMessage.role),
              model: MODEL_ID,
              parts: responseMessage.parts as unknown as Prisma.InputJsonValue,
            },
          });
          const toolRows = extractToolRows(responseMessage.parts as StoredPart[]);
          if (toolRows.length > 0) {
            await prisma.toolCall.createMany({
              data: toolRows.map((row) => ({
                sessionId: id,
                messageId: created.id,
                ...row,
              })),
              skipDuplicates: true,
            });
          }
        } catch (err) {
          console.error("failed to persist assistant message", err);
        }
      },
    });
  });
