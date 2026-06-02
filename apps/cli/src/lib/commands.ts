import type { NavigateFunction } from "react-router";
import { login, logout, whoami } from "./auth";
import { toast } from "./toast";

export interface CommandContext {
  navigate: NavigateFunction;
  exit: () => void;
  openSessions: () => void;
  openThemes: () => void;
  openModels: () => void;
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
    name: "model",
    description: "Switch model",
    run: ({ openModels }) => openModels(),
  },
  {
    name: "login",
    description: "Sign in with your browser",
    run: () => {
      void login();
    },
  },
  {
    name: "logout",
    description: "Sign out and clear the saved session",
    run: () => {
      void logout();
    },
  },
  {
    name: "whoami",
    description: "Show the signed-in account and token status",
    run: () => {
      void whoami();
    },
  },
  {
    name: "exit",
    description: "Close Lightcode",
    run: ({ exit }) => exit(),
  },
  {
    name: "toast",
    description: "Show a default toast",
    run: () => toast("Heads up", { description: "This is a default toast" }),
  },
  {
    name: "success",
    description: "Show a success toast",
    run: () => toast.success("Saved", { description: "Your changes were saved" }),
  },
  {
    name: "error",
    description: "Show an error toast",
    run: () => toast.error("Something went wrong", { description: "Could not reach the server" }),
  },
  {
    name: "info",
    description: "Show an info toast",
    run: () => toast.info("Did you know?", { description: "Press / to open commands" }),
  },
  {
    name: "warning",
    description: "Show a warning toast",
    run: () => toast.warning("Heads up", { description: "Your session is about to expire" }),
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
