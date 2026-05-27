import { z } from "zod";

export const writeFileSchema = {
  name: "writeFile",
  description:
    "Create or overwrite a UTF-8 text file inside the working directory. Parent directories are created as needed.",
  inputSchema: z.object({
    path: z
      .string()
      .min(1)
      .describe("File path relative to the working directory."),
    content: z.string().describe("Full file contents to write."),
  }),
  outputSchema: z.object({
    path: z.string(),
    bytesWritten: z.number().int().nonnegative(),
    created: z.boolean().describe("True if the file did not exist before."),
  }),
} as const;
