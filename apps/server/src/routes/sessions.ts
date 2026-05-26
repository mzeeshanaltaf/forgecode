import { Hono } from "hono";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  generateId,
  generateText,
  NoSuchToolError,
  Output,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type ToolSet,
  type UIMessage,
  type UIMessagePart,
} from "ai";
import { z } from "zod";
import { postMessageRequestSchema } from "@lightcode/shared";
import { tools as agentTools } from "@lightcode/tools";
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

const baseInstructions = [
  "You are a coding agent.",
  "You have file and shell tools that execute on the user's machine; the server itself has no filesystem access.",
  "All paths are relative to the user's working directory. Do not assume any path outside it is accessible — the CLI will reject such calls.",
  "Prefer reading files before editing them. When using editFile, include enough surrounding context in oldString to make the match unique.",
].join(" ");

const toolDefs: ToolSet = Object.fromEntries(
  Object.entries(agentTools).map(([name, t]) => [
    name,
    tool({
      description: t.description,
      inputSchema: t.inputSchema as never,
    }),
  ]),
);

const callOptionsSchema = z.object({ cwd: z.string().min(1) });

const codingAgent = new ToolLoopAgent({
  model: openai(MODEL_ID),
  instructions: baseInstructions,
  tools: toolDefs,
  stopWhen: stepCountIs(16),
  providerOptions: {
    openai: { reasoningSummary: "auto", serviceTier: SERVICE_TIER },
  },
  callOptionsSchema,
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: `${settings.instructions ?? ""}\n\nWorking directory: ${options.cwd}`,
  }),
  experimental_repairToolCall: async ({ toolCall, tools: toolset, error }) => {
    if (NoSuchToolError.isInstance(error)) return null;
    const matched = (toolset as Record<string, { inputSchema?: unknown }>)[
      toolCall.toolName
    ];
    if (!matched?.inputSchema) return null;
    try {
      const repair = await generateText({
        model: openai(MODEL_ID),
        output: Output.object({ schema: matched.inputSchema as never }),
        prompt: [
          `The previous call to tool "${toolCall.toolName}" had malformed input.`,
          `Original input: ${
            typeof toolCall.input === "string"
              ? toolCall.input
              : JSON.stringify(toolCall.input)
          }`,
          `Error: ${error.message}`,
          "Return a corrected input that matches the tool's input schema.",
        ].join("\n"),
      });
      return { ...toolCall, input: JSON.stringify(repair.output) };
    } catch (repairErr) {
      console.error("tool-call repair failed", repairErr);
      return null;
    }
  },
});

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
    const cwd = parsed.data.cwd;

    const upserted = await prisma.message.upsert({
      where: { sessionId_clientId: { sessionId: id, clientId: incoming.id } },
      update: {
        role: roleOf(incoming.role),
        parts: incoming.parts as unknown as Prisma.InputJsonValue,
      },
      create: {
        sessionId: id,
        clientId: incoming.id,
        role: roleOf(incoming.role),
        parts: incoming.parts as unknown as Prisma.InputJsonValue,
      },
    });

    // Re-sync auxiliary tool-call rows from the (possibly updated) parts so that
    // the side table reflects the latest input/output state for this message.
    const incomingToolRows = extractToolRows(incoming.parts as StoredPart[]);
    await prisma.toolCall.deleteMany({ where: { messageId: upserted.id } });
    if (incomingToolRows.length > 0) {
      await prisma.toolCall.createMany({
        data: incomingToolRows.map((row) => ({
          sessionId: id,
          messageId: upserted.id,
          ...row,
        })),
      });
    }

    const historyRows = await prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "asc" },
    });
    const history: UIMessage[] = historyRows.map((row) => ({
      id: row.clientId,
      role: row.role,
      parts: row.parts as unknown as UIMessage["parts"],
    }));

    const modelMessages = await convertToModelMessages(history);

    const result = await codingAgent.stream({
      messages: modelMessages,
      options: { cwd },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: history,
      generateMessageId: generateId,
      onError(streamErr) {
        const err =
          streamErr instanceof Error ? streamErr : new Error(String(streamErr));
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
        return err.message;
      },
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
