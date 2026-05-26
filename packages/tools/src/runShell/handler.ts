import type { z } from "zod";
import {
  runShellSchema,
  RUN_SHELL_DEFAULT_TIMEOUT_MS,
  RUN_SHELL_MAX_OUTPUT_BYTES,
} from "./schema";
import type { ToolContext } from "../handlers";

type Input = z.infer<typeof runShellSchema.inputSchema>;
type Output = z.infer<typeof runShellSchema.outputSchema>;

function truncate(buf: Buffer): { text: string; truncated: boolean } {
  if (buf.byteLength <= RUN_SHELL_MAX_OUTPUT_BYTES) {
    return { text: buf.toString("utf8"), truncated: false };
  }
  return {
    text: buf.subarray(0, RUN_SHELL_MAX_OUTPUT_BYTES).toString("utf8"),
    truncated: true,
  };
}

export async function runShellHandler(input: Input, ctx: ToolContext): Promise<Output> {
  const timeoutMs = input.timeoutMs ?? RUN_SHELL_DEFAULT_TIMEOUT_MS;
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
  const args = process.platform === "win32" ? ["/c", input.command] : ["-c", input.command];

  const proc = Bun.spawn([shell, ...args], {
    cwd: ctx.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs);

  const [stdoutBuf, stderrBuf, exitCode] = await Promise.all([
    new Response(proc.stdout).bytes(),
    new Response(proc.stderr).bytes(),
    proc.exited,
  ]);
  clearTimeout(timer);

  const stdout = truncate(Buffer.from(stdoutBuf));
  const stderr = truncate(Buffer.from(stderrBuf));

  return {
    stdout: stdout.text,
    stderr: stderr.text,
    exitCode: typeof exitCode === "number" ? exitCode : (timedOut ? 124 : -1),
    timedOut,
    truncated: stdout.truncated || stderr.truncated,
  };
}
