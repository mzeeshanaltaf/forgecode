import { resolve, sep } from "node:path";
import { existsSync, realpathSync } from "node:fs";

/**
 * Resolve `input` against `cwd` and guarantee the result stays inside `cwd`.
 * Realpath both ends so symlinks cannot be used to escape.
 */
export function resolveSafe(cwd: string, input: string): string {
  const cwdReal = realpathSync(cwd);
  const target = resolve(cwdReal, input);

  // Realpath the deepest existing ancestor (so writes to not-yet-created files
  // still resolve), then re-append the not-yet-existing tail.
  let probe = target;
  const tail: string[] = [];
  while (!existsSync(probe)) {
    const parent = resolve(probe, "..");
    if (parent === probe) break;
    tail.unshift(probe.slice(parent.length + 1));
    probe = parent;
  }
  const probeReal = existsSync(probe) ? realpathSync(probe) : probe;
  const resolved = tail.length === 0 ? probeReal : resolve(probeReal, ...tail);

  if (resolved !== cwdReal && !resolved.startsWith(cwdReal + sep)) {
    throw new Error(`path escapes working directory: ${input}`);
  }
  return resolved;
}
