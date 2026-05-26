import { readFile as fsReadFile, stat } from "node:fs/promises";
import { relative } from "node:path";
import type { z } from "zod";
import { grepSchema, GREP_MAX_MATCHES } from "./schema";
import { resolveSafe } from "../resolve-safe";
import type { ToolContext } from "../handlers";

type Input = z.infer<typeof grepSchema.inputSchema>;
type Output = z.infer<typeof grepSchema.outputSchema>;

const DEFAULT_GLOB = "**/*";
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "generated",
]);

async function* walkFiles(
  rootAbs: string,
  cwd: string,
  matcher: Bun.Glob,
): AsyncGenerator<string> {
  for await (const match of matcher.scan({
    cwd: rootAbs,
    onlyFiles: true,
    dot: false,
  })) {
    if (match.split(/[\\/]/).some((seg) => SKIP_DIRS.has(seg))) continue;
    let absMatch: string;
    try {
      absMatch = resolveSafe(cwd, `${rootAbs}/${match}`);
    } catch {
      continue;
    }
    yield absMatch;
  }
}

export async function grepHandler(input: Input, ctx: ToolContext): Promise<Output> {
  const rootAbs = resolveSafe(ctx.cwd, input.path ?? ".");
  const info = await stat(rootAbs);
  const flags = input.caseInsensitive ? "i" : "";
  const regex = new RegExp(input.pattern, flags);

  const matches: Output["matches"] = [];
  let truncated = false;

  const pushMatches = async (absFile: string) => {
    let content: string;
    try {
      content = await fsReadFile(absFile, "utf8");
    } catch {
      return;
    }
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line !== undefined && regex.test(line)) {
        if (matches.length >= GREP_MAX_MATCHES) {
          truncated = true;
          return;
        }
        matches.push({
          path: relative(ctx.cwd, absFile).split("\\").join("/"),
          line: i + 1,
          text: line.length > 500 ? line.slice(0, 500) : line,
        });
      }
    }
  };

  if (info.isFile()) {
    await pushMatches(rootAbs);
  } else {
    const matcher = new Bun.Glob(input.glob ?? DEFAULT_GLOB);
    for await (const absFile of walkFiles(rootAbs, ctx.cwd, matcher)) {
      await pushMatches(absFile);
      if (truncated) break;
    }
  }

  return { matches, truncated };
}
