import { z } from "zod";
import { DEFAULT_MODE, modeSchema } from "./modes";

export type { UIMessage } from "ai";

export const chatLocationStateSchema = z.object({
  input: z.string().trim().min(1),
});

export type ChatLocationState = z.infer<typeof chatLocationStateSchema>;

const uiMessagePartSchema = z.looseObject({ type: z.string() });

export const uiMessageSchema = z.looseObject({
  id: z.string(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(uiMessagePartSchema),
});

export const postMessageRequestSchema = z.object({
  message: uiMessageSchema,
  cwd: z.string().min(1),
  mode: modeSchema.default(DEFAULT_MODE),
});

export type PostMessageRequest = z.infer<typeof postMessageRequestSchema>;

const sessionMessageItemSchema = z.looseObject({
  id: z.string(),
  role: z.enum(["system", "user", "assistant"]),
  mode: modeSchema,
  parts: z.array(uiMessagePartSchema),
});

export type SessionMessageItem = z.infer<typeof sessionMessageItemSchema>;

export const sessionMessagesResponseSchema = z.object({
  messages: z.array(sessionMessageItemSchema),
});

export type SessionMessagesResponse = z.infer<typeof sessionMessagesResponseSchema>;

const sessionSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  updatedAt: z.string(),
});

export type SessionSummary = z.infer<typeof sessionSummarySchema>;

export const sessionListResponseSchema = z.object({
  sessions: z.array(sessionSummarySchema),
});

export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;
