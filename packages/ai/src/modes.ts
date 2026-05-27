import { z } from "zod";
import type { ToolName } from "./tools";

export const MODE_NAMES = ["build", "plan"] as const;

export const modeSchema = z.enum(MODE_NAMES);
export type ModeName = z.infer<typeof modeSchema>;

export const DEFAULT_MODE: ModeName = "build";

export interface ModeDefinition {
  name: ModeName;
  label: string;
  description: string;
  instructions: string;
  tools: readonly ToolName[];
}

const READ_ONLY_TOOLS = [
  "readFile",
  "listDirectory",
  "glob",
  "grep",
] as const satisfies readonly ToolName[];

const ALL_TOOLS = [
  "readFile",
  "writeFile",
  "editFile",
  "listDirectory",
  "glob",
  "grep",
  "runShell",
] as const satisfies readonly ToolName[];

export const modes: Record<ModeName, ModeDefinition> = {
  build: {
    name: "build",
    label: "Build",
    description: "Full access — read, write, and run commands.",
    instructions:
      "You may read, modify, and create files and run shell commands to accomplish the task.",
    tools: ALL_TOOLS,
  },
  plan: {
    name: "plan",
    label: "Plan",
    description: "Read-only — research and propose, no changes.",
    instructions:
      "You are in PLAN (read-only) mode. You may ONLY inspect the codebase with read tools. " +
      "Do NOT attempt to modify files or run shell commands — those tools are unavailable. " +
      "Investigate thoroughly, then present a clear, step-by-step plan for the user to approve.",
    tools: READ_ONLY_TOOLS,
  },
};

export function nextMode(current: ModeName): ModeName {
  const i = MODE_NAMES.indexOf(current);
  return MODE_NAMES[(i + 1) % MODE_NAMES.length]!;
}

export function prevMode(current: ModeName): ModeName {
  const i = MODE_NAMES.indexOf(current);
  return MODE_NAMES[(i - 1 + MODE_NAMES.length) % MODE_NAMES.length]!;
}
