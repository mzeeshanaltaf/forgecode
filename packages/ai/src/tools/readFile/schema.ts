import { z } from "zod";

export const READ_FILE_MAX_BYTES = 200_000;

export const readFileSchema = {
  name: "readFile",
  description:
    "Read a UTF-8 text file from the working directory. Paths must be relative to the working directory or absolute paths that resolve inside it. Large files are truncated.",
  inputSchema: z.object({
    path: z
      .string()
      .min(1)
      .describe("File path relative to the working directory."),
  }),
  outputSchema: z.object({
    path: z.string(),
    content: z.string(),
    truncated: z.boolean(),
    bytes: z.number().int().nonnegative(),
  }),
} as const;
