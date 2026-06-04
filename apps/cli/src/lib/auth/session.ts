import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { sessionSchema, type Session } from "./schemas";

/**
 * Persisted auth session. Mirrors the theme `config.ts` pattern (same
 * `~/.forgecode/` dir, best-effort writes that never crash the TUI, zod-
 * validated reads) but lives in its own `auth.json` and is written with
 * owner-only `0o600` permissions since it holds bearer tokens.
 */
function sessionPath(): string {
  return join(homedir(), ".forgecode", "auth.json");
}

export function loadSession(): Session | null {
  try {
    const raw = readFileSync(sessionPath(), "utf8");
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    // Missing, unreadable, or corrupt — treat as signed out.
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    const path = sessionPath();
    mkdirSync(dirname(path), { recursive: true });
    // `mode` only applies when the file is first created; chmod afterwards
    // covers the overwrite case. Both are best-effort (Windows honours them
    // partially) and a failure must not crash the TUI.
    writeFileSync(path, `${JSON.stringify(session, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    chmodSync(path, 0o600);
  } catch {
    // Best-effort persistence.
  }
}

export function clearSession(): void {
  try {
    rmSync(sessionPath(), { force: true });
  } catch {
    // Already gone or unreadable — nothing to do.
  }
}
