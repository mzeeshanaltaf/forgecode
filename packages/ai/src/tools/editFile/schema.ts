import { z } from "zod";

export const editFileSchema = {
  name: "editFile",
  description:
    "Perform a string replacement on an existing file. oldString must appear in the file. If replaceAll is false (default) oldString must match exactly once; otherwise the call fails so the model can disambiguate by providing more context.",
  inputSchema: z.object({
    path: z
      .string()
      .min(1)
      .describe("File path relative to the working directory."),
    oldString: z
      .string()
      .min(1)
      .describe("Exact substring to replace. Include surrounding context to make it unique."),
    newString: z.string().describe("Replacement text."),
    replaceAll: z
      .boolean()
      .optional()
      .describe("Replace every occurrence instead of requiring a single unique match."),
  }),
  outputSchema: z.object({
    path: z.string(),
    replacements: z.number().int().nonnegative(),
  }),
} as const;
