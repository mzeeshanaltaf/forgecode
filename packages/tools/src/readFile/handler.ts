import { readFile as fsReadFile, stat } from "node:fs/promises";
import { relative } from "node:path";
import type { z } from "zod";
import { readFileSchema, READ_FILE_MAX_BYTES } from "./schema";
import { resolveSafe } from "../resolve-safe";
import type { ToolContext } from "../handlers";

type Input = z.infer<typeof readFileSchema.inputSchema>;
type Output = z.infer<typeof readFileSchema.outputSchema>;

export async function readFileHandler(input: Input, ctx: ToolContext): Promise<Output> {
  const abs = resolveSafe(ctx.cwd, input.path);
  const info = await stat(abs);
  if (!info.isFile()) {
    throw new Error(`not a file: ${input.path}`);
  }
  const truncated = info.size > READ_FILE_MAX_BYTES;
  const buf = await fsReadFile(abs);
  const sliced = truncated ? buf.subarray(0, READ_FILE_MAX_BYTES) : buf;
  return {
    path: relative(ctx.cwd, abs).split("\\").join("/") || ".",
    content: sliced.toString("utf8"),
    truncated,
    bytes: info.size,
  };
}
