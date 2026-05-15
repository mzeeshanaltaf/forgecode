import { z } from "zod";

export const chatLocationStateSchema = z.object({
  input: z.string().trim().min(1),
});

export type ChatLocationState = z.infer<typeof chatLocationStateSchema>;
