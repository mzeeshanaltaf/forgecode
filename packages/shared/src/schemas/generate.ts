import { z } from "zod";

export const generateRequestSchema = z.object({
  prompt: z.string().trim().min(1),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
