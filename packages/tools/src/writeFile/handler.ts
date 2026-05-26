import { mkdir, writeFile as fsWriteFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, relative } from "node:path";
import type { z } from "zod";
import { writeFileSchema } from "./schema";
import { resolveSafe } from "../resolve-safe";
import type { ToolContext } from "../handlers";

type Input = z.infer<typeof writeFileSchema.inputSchema>;
type Output = z.infer<typeof writeFileSchema.outputSchema>;

export async function writeFileHandler(input: Input, ctx: ToolContext): Promise<Output> {
  const abs = resolveSafe(ctx.cwd, input.path);
  const existed = existsSync(abs);
  await mkdir(dirname(abs), { recursive: true });
  await fsWriteFile(abs, input.content, "utf8");
  return {
    path: relative(ctx.cwd, abs).split("\\").join("/") || ".",
    bytesWritten: Buffer.byteLength(input.content, "utf8"),
    created: !existed,
  };
}
