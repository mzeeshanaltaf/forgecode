import { readFile as fsReadFile, writeFile as fsWriteFile } from "node:fs/promises";
import { relative } from "node:path";
import type { z } from "zod";
import { editFileSchema } from "./schema";
import { resolveSafe } from "../resolve-safe";
import type { ToolContext } from "../handlers";

type Input = z.infer<typeof editFileSchema.inputSchema>;
type Output = z.infer<typeof editFileSchema.outputSchema>;

export async function editFileHandler(input: Input, ctx: ToolContext): Promise<Output> {
  const abs = resolveSafe(ctx.cwd, input.path);
  const original = await fsReadFile(abs, "utf8");
  const replaceAll = input.replaceAll ?? false;

  let occurrences = 0;
  let idx = original.indexOf(input.oldString);
  while (idx !== -1) {
    occurrences += 1;
    idx = original.indexOf(input.oldString, idx + input.oldString.length);
    if (!replaceAll && occurrences > 1) break;
  }

  if (occurrences === 0) {
    throw new Error(`oldString not found in ${input.path}`);
  }
  if (!replaceAll && occurrences > 1) {
    throw new Error(
      `oldString matched ${occurrences} times in ${input.path}; include more surrounding context or pass replaceAll: true`,
    );
  }

  const updated = replaceAll
    ? original.split(input.oldString).join(input.newString)
    : original.replace(input.oldString, input.newString);

  await fsWriteFile(abs, updated, "utf8");
  return {
    path: relative(ctx.cwd, abs).split("\\").join("/") || ".",
    replacements: replaceAll ? occurrences : 1,
  };
}
