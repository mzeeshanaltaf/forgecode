import type { NavigateFunction } from "react-router";

export interface CommandContext {
  navigate: NavigateFunction;
  exit: () => void;
  openSessions: () => void;
  openThemes: () => void;
}

export interface Command {
  name: string;
  description: string;
  run: (ctx: CommandContext) => void;
}

export const commands: Command[] = [
  {
    name: "new",
    description: "Start a new chat",
    run: ({ navigate }) => navigate("/"),
  },
  {
    name: "sessions",
    description: "Browse sessions",
    run: ({ openSessions }) => openSessions(),
  },
  {
    name: "theme",
    description: "Switch theme",
    run: ({ openThemes }) => openThemes(),
  },
  {
    name: "exit",
    description: "Close Lightcode",
    run: ({ exit }) => exit(),
  },
  ...Array.from({ length: 10 }, (_, i) => ({
    name: `dummy${i + 1}`,
    description: `Dummy command ${i + 1} (does nothing)`,
    run: () => {},
  })),
];

/**
 * Returns the command-name fragment the user is typing, or null when the input
 * isn't a command context. A command context is a leading "/" followed by a
 * single token (no whitespace) — so "/new" qualifies but "/new foo", a quoted
 * "/new", or plain prose does not.
 */
export function getCommandQuery(value: string): string | null {
  if (!value.startsWith("/")) return null;
  const rest = value.slice(1);
  if (/\s/.test(rest)) return null;
  return rest;
}

export function filterCommands(query: string): Command[] {
  if (query === "") return commands;
  const q = query.toLowerCase();
  return commands.filter((c) => c.name.toLowerCase().includes(q));
}
