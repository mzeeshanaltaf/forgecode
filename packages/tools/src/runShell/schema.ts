import { z } from "zod";

export const RUN_SHELL_DEFAULT_TIMEOUT_MS = 60_000;
export const RUN_SHELL_MAX_OUTPUT_BYTES = 100_000;

export const runShellSchema = {
  name: "runShell",
  description:
    "Run a shell command in the working directory and return its stdout, stderr, and exit code. Output is truncated if very large. Use for inspecting state (e.g. git status) or running build/test commands.",
  inputSchema: z.object({
    command: z.string().min(1).describe("Shell command to execute."),
    timeoutMs: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Override the default 60s timeout."),
  }),
  outputSchema: z.object({
    stdout: z.string(),
    stderr: z.string(),
    exitCode: z.number().int(),
    timedOut: z.boolean(),
    truncated: z.boolean(),
  }),
} as const;
