import { Hono } from "hono";
import { runCodingTurn } from "@forgecode/ai/agent";
import { extractToolRows, type StoredPart } from "@forgecode/ai/parts";
import { postMessageRequestSchema, type UIMessage } from "@forgecode/ai/messages";
import { generateSessionTitle } from "@forgecode/ai/title";
import { prisma } from "../db";
import { clerkAuth, type AuthEnv } from "../middleware/auth";
import { requireCredits } from "../middleware/credits";
import { tryGetPayments } from "../payments";
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

/**
 * Upserts a message and re-syncs its auxiliary tool-call rows. Used for both the
 * incoming user message and the assistant response. The upsert (rather than a
 * plain create) is essential for the assistant: during a client-side tool loop
 * the CLI re-sends the conversation to continue, and the SDK keeps the same
 * assistant message id across those turns — so onFinish fires repeatedly for an
 * id whose row already exists. `model` is left undefined for messages that have
 * none (user turns), which Prisma ignores on update and stores as null on create.
 */
async function persistMessage(params: {
  sessionId: string;
  message: UIMessage;
  mode: string;
  model?: string;
}): Promise<void> {
  const { sessionId, message, mode, model } = params;
  const parts = message.parts as unknown as Prisma.InputJsonValue;

  const upserted = await prisma.message.upsert({
    where: { sessionId_clientId: { sessionId, clientId: message.id } },
    update: { role: roleOf(message.role), model, mode, parts },
    create: { sessionId, clientId: message.id, role: roleOf(message.role), model, mode, parts },
  });

  // Re-sync auxiliary tool-call rows from the (possibly updated) parts so the
  // side table reflects the latest input/output state for this message.
  const toolRows = extractToolRows(message.parts as StoredPart[]);
  await prisma.toolCall.deleteMany({ where: { messageId: upserted.id } });
  if (toolRows.length > 0) {
    await prisma.toolCall.createMany({
      data: toolRows.map((row) => ({
        sessionId,
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
}

export const sessionsRoute = new Hono<AuthEnv>()
  .use(clerkAuth)
  .get("/", async (c) => {
    const sessions = await prisma.session.findMany({
      where: { userId: c.get("userId") },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });
    return c.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt.toISOString(),
      })),
    });
  })
  .post("/", async (c) => {
    const session = await prisma.session.create({
      data: { userId: c.get("userId") },
    });
    return c.json({ id: session.id });
  })
  .get("/:id/messages", async (c) => {
    const id = c.req.param("id");
    const session = await prisma.session.findFirst({
      where: { id, userId: c.get("userId") },
    });
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
      model: row.model,
      parts: row.parts,
    }));
    return c.json({ messages });
  })
  .post("/:id/messages", requireCredits, async (c) => {
    const id = c.req.param("id");
    console.log("[msg] enter, looking up session", id);
    const session = await prisma.session.findFirst({
      where: { id, userId: c.get("userId") },
    });
    if (!session) {
      return c.json({ error: "session not found" }, 404);
    }

    console.log("[msg] session found, reading request body");
    const body = await c.req.json().catch(() => null);
    console.log("[msg] body read, parsing");
    const parsed = postMessageRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid request", issues: parsed.error.issues }, 400);
    }

    const incoming = parsed.data.message as UIMessage;
    const cwd = parsed.data.cwd;
    const mode = parsed.data.mode;
    const model = parsed.data.model;

    console.log("[msg] persisting incoming message");
    await persistMessage({ sessionId: id, message: incoming, mode });
    console.log("[msg] persisted, fetching history");

    // Deduct one credit for this message (1 message = 1 credit). Fire-and-forget
    // and best-effort: a metering hiccup must never fail the chat turn — the
    // credit gate (requireCredits) is what enforces the limit on the next send.
    void tryGetPayments()
      ?.ingestUsage({
        externalCustomerId: c.get("userId"),
        metadata: { mode, ...(model ? { model } : {}) },
      })
      .catch((err) => console.error("usage ingest failed", err));

    // First message of an untitled session: generate a short title in the
    // background. Fire-and-forget so it never blocks or breaks the chat turn —
    // on any failure the session simply stays "Untitled session".
    if (session.title === null) {
      void (async () => {
        try {
          const title = await generateSessionTitle(incoming);
          if (title) {
            await prisma.session.update({ where: { id }, data: { title } });
          }
        } catch (err) {
          console.error("failed to generate session title", err);
        }
      })();
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

    console.log("[msg] history fetched, calling runCodingTurn", { count: history.length });
    return runCodingTurn({
      history,
      cwd,
      mode,
      model,
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
        await persistMessage({ sessionId: id, message: responseMessage, mode, model });
      },
    });
  });
