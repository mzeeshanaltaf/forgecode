import { relative } from "node:path";
import type { z } from "zod";
import { globSchema, GLOB_MAX_PATHS } from "./schema";
import { resolveSafe } from "../resolve-safe";
import type { ToolContext } from "../handlers";

type Input = z.infer<typeof globSchema.inputSchema>;
type Output = z.infer<typeof globSchema.outputSchema>;

export async function globHandler(input: Input, ctx: ToolContext): Promise<Output> {
  const rootAbs = resolveSafe(ctx.cwd, input.path ?? ".");
  const matcher = new Bun.Glob(input.pattern);
  const paths: string[] = [];
  let truncated = false;
  for await (const match of matcher.scan({ cwd: rootAbs, onlyFiles: false, dot: false })) {
    if (paths.length >= GLOB_MAX_PATHS) {
      truncated = true;
      break;
    }
    let absMatch: string;
    try {
      absMatch = resolveSafe(ctx.cwd, `${rootAbs}/${match}`);
    } catch {
      continue;
    }
    paths.push(relative(ctx.cwd, absMatch).split("\\").join("/"));
  }
  return { paths, truncated };
}
