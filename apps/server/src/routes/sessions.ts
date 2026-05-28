import { Hono } from "hono";
import {
  CODING_AGENT_MODEL_ID,
  runCodingTurn,
} from "@lightcode/ai/agent";
import { extractToolRows, type StoredPart } from "@lightcode/ai/parts";
import { postMessageRequestSchema, type UIMessage } from "@lightcode/ai/messages";
import { prisma } from "../db";
import { MessageRole, type Prisma } from "../../generated/client";

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
      mode: row.mode,
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
    const mode = parsed.data.mode;

    const upserted = await prisma.message.upsert({
      where: { sessionId_clientId: { sessionId: id, clientId: incoming.id } },
      update: {
        role: roleOf(incoming.role),
        mode,
        parts: incoming.parts as unknown as Prisma.InputJsonValue,
      },
      create: {
        sessionId: id,
        clientId: incoming.id,
        role: roleOf(incoming.role),
        mode,
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
          toolCallId: row.toolCallId,
          toolName: row.toolName,
          state: row.state,
          input: row.input === undefined ? undefined : (row.input as Prisma.InputJsonValue),
          output: row.output === undefined ? undefined : (row.output as Prisma.InputJsonValue),
          errorText: row.errorText,
          providerExecuted: row.providerExecuted,
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

    return runCodingTurn({
      history,
      cwd,
      mode,
      onError: async (err) => {
        await prisma.sessionError
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
      onFinish: async ({ responseMessage }) => {
        const created = await prisma.message.create({
          data: {
            sessionId: id,
            clientId: responseMessage.id,
            role: roleOf(responseMessage.role),
            model: CODING_AGENT_MODEL_ID,
            mode,
            parts: responseMessage.parts as unknown as Prisma.InputJsonValue,
          },
        });
        const toolRows = extractToolRows(responseMessage.parts as StoredPart[]);
        if (toolRows.length > 0) {
          await prisma.toolCall.createMany({
            data: toolRows.map((row) => ({
              sessionId: id,
              messageId: created.id,
              toolCallId: row.toolCallId,
              toolName: row.toolName,
              state: row.state,
              input: row.input === undefined ? undefined : (row.input as Prisma.InputJsonValue),
              output: row.output === undefined ? undefined : (row.output as Prisma.InputJsonValue),
              errorText: row.errorText,
              providerExecuted: row.providerExecuted,
            })),
            skipDuplicates: true,
          });
        }
      },
    });
  });
