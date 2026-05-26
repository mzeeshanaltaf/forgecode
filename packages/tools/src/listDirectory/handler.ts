import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { z } from "zod";
import { listDirectorySchema } from "./schema";
import { resolveSafe } from "../resolve-safe";
import type { ToolContext } from "../handlers";

type Input = z.infer<typeof listDirectorySchema.inputSchema>;
type Output = z.infer<typeof listDirectorySchema.outputSchema>;

export async function listDirectoryHandler(input: Input, ctx: ToolContext): Promise<Output> {
  const abs = resolveSafe(ctx.cwd, input.path);
  const info = await stat(abs);
  if (!info.isDirectory()) {
    throw new Error(`not a directory: ${input.path}`);
  }
  const names = await readdir(abs);
  const entries = await Promise.all(
    names.map(async (name) => {
      try {
        const s = await stat(join(abs, name));
        const type = s.isDirectory() ? "dir" : s.isFile() ? "file" : "other";
        return type === "file"
          ? { name, type: type as "file", size: s.size }
          : { name, type: type as "dir" | "other" };
      } catch {
        return { name, type: "other" as const };
      }
    }),
  );
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return {
    path: relative(ctx.cwd, abs).split("\\").join("/") || ".",
    entries,
  };
}
