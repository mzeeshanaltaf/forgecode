import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Bootstraps runtime env for the standalone `forgecode` binary.
 *
 * When launched via `dev:cli`, Bun's `--env-file=apps/server/.env` already
 * populates `process.env`. But the linked `forgecode` bin runs with no such
 * flag from an arbitrary cwd, so it has none of the Clerk OAuth vars that
 * `lib/auth/env.ts` needs for `/login`, nor `FORGECODE_SERVER_URL`.
 *
 * We read `~/.forgecode/.env` (a stable home-dir location, same dir as
 * `config.ts`) and assign only keys that aren't already set — so an explicit
 * `FOO=bar forgecode` and the existing `--env-file` path both still win.
 *
 * Imported for its side effect as the very first import in `index.tsx` so the
 * env is in place before any module reads `process.env` at load time.
 */
function envPath(): string {
  return join(homedir(), ".forgecode", ".env");
}

function parseEnv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    let value = trimmed.slice(eq + 1).trim();
    // Strip a single layer of surrounding matching quotes.
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

try {
  const parsed = parseEnv(readFileSync(envPath(), "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
} catch {
  // Missing or unreadable file — no-op. `dev:cli` supplies env another way,
  // and a standalone launch without this file simply fails at /login with a
  // clear "Clerk OAuth env vars are not set" message.
}
