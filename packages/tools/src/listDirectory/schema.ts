import { z } from "zod";

export const listDirectorySchema = {
  name: "listDirectory",
  description:
    "List the entries of a directory inside the working directory. Returns names with their kind (file or dir).",
  inputSchema: z.object({
    path: z
      .string()
      .min(1)
      .default(".")
      .describe("Directory path relative to the working directory. Defaults to '.'."),
  }),
  outputSchema: z.object({
    path: z.string(),
    entries: z.array(
      z.object({
        name: z.string(),
        type: z.enum(["file", "dir", "other"]),
        size: z.number().int().nonnegative().optional(),
      }),
    ),
  }),
} as const;
