import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
]);
const MAX_FILES = 5000;
const MAX_RESULTS = 50;

export interface FileMention {
  /** The fragment typed after "@" (may be empty), e.g. "src/foo". */
  query: string;
  /** Index of the triggering "@" within the input. */
  start: number;
}

// A mention is the trailing "@<token>" of the input: the "@" sits at the
// start of the line or right after whitespace, and everything up to the end of
// the string is non-whitespace. Anchoring to the end (rather than the cursor)
// mirrors how command detection works, so moving the cursor can't break it.
//
// The leading `(?:^|\s)` is what excludes emails ("foo@bar" — the "@" follows a
// letter) and quoted/bracketed contexts ('"@x' — the "@" follows a quote): in
// both the character before "@" is neither start-of-line nor whitespace.
const MENTION_RE = /(?:^|\s)@(\S*)$/;

export function getFileMentionQuery(text: string): FileMention | null {
  const match = MENTION_RE.exec(text);
  if (!match) return null;
  const query = match[1] ?? "";
  // match[0] is "@<query>" or " @<query>"; the "@" sits query.length+1 chars
  // before the match end.
  const start = match.index + match[0].length - (query.length + 1);
  return { query, start };
}

export function filterFiles(query: string, files: string[]): string[] {
  if (query === "") return files.slice(0, MAX_RESULTS);
  const q = query.toLowerCase();
  const scored: { path: string; score: number }[] = [];
  for (const path of files) {
    const lower = path.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) continue;
    const base = lower.slice(lower.lastIndexOf("/") + 1);
    const baseIdx = base.indexOf(q);
    // Rank filename-prefix matches first, then filename matches, then
    // anywhere-in-path; break ties by match position and path length.
    const rank = baseIdx === 0 ? 0 : baseIdx > 0 ? 1 : 2;
    scored.push({ path, score: rank * 1_000_000 + idx * 1000 + path.length });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, MAX_RESULTS).map((s) => s.path);
}

let cache: Promise<string[]> | null = null;

/** Lazily scan the working directory once and cache the relative file list. */
export function loadProjectFiles(): Promise<string[]> {
  if (!cache) cache = scan(process.cwd());
  return cache;
}

async function scan(root: string): Promise<string[]> {
  const out: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    if (out.length >= MAX_FILES) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= MAX_FILES) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || IGNORE_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile()) {
        out.push(relative(root, full).split(sep).join("/"));
      }
    }
  };

  await walk(root);
  out.sort();
  return out;
}
