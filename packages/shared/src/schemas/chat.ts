import { z } from "zod";

export const chatLocationStateSchema = z.object({
  input: z.string().trim().min(1),
});

export type ChatLocationState = z.infer<typeof chatLocationStateSchema>;

const uiMessagePartSchema = z.looseObject({ type: z.string() });

const uiMessageSchema = z.looseObject({
  id: z.string(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(uiMessagePartSchema),
});

export const chatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).min(1),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
