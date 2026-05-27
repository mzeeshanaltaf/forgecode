import { z } from "zod";

export const GREP_MAX_MATCHES = 200;

export const grepSchema = {
  name: "grep",
  description:
    "Search for a regular expression across files within the working directory. Returns matching lines with their file path and 1-based line number. Results are capped.",
  inputSchema: z.object({
    pattern: z
      .string()
      .min(1)
      .describe("Regular expression to search for (JavaScript flavor)."),
    path: z
      .string()
      .optional()
      .describe("Directory or file to search under. Defaults to the working directory."),
    glob: z
      .string()
      .optional()
      .describe("Optional glob (e.g. '**/*.ts') to restrict which files are searched."),
    caseInsensitive: z.boolean().optional(),
  }),
  outputSchema: z.object({
    matches: z.array(
      z.object({
        path: z.string(),
        line: z.number().int().positive(),
        text: z.string(),
      }),
    ),
    truncated: z.boolean(),
  }),
} as const;
