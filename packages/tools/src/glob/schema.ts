import { z } from "zod";

export const GLOB_MAX_PATHS = 500;

export const globSchema = {
  name: "glob",
  description:
    "Find files by glob pattern within the working directory (e.g. '**/*.ts'). Returns paths relative to the working directory. Results are capped.",
  inputSchema: z.object({
    pattern: z
      .string()
      .min(1)
      .describe("Glob pattern relative to the search root."),
    path: z
      .string()
      .optional()
      .describe("Directory to search under. Defaults to the working directory."),
  }),
  outputSchema: z.object({
    paths: z.array(z.string()),
    truncated: z.boolean(),
  }),
} as const;
