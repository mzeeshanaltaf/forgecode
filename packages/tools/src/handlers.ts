import type { z } from "zod";
import { tools, type ToolName } from "./index";
import { readFileHandler } from "./readFile/handler";
import { writeFileHandler } from "./writeFile/handler";
import { editFileHandler } from "./editFile/handler";
import { listDirectoryHandler } from "./listDirectory/handler";
import { grepHandler } from "./grep/handler";
import { globHandler } from "./glob/handler";
import { runShellHandler } from "./runShell/handler";

export type ToolContext = { cwd: string };

export type ToolInput<N extends ToolName> = z.infer<
  (typeof tools)[N]["inputSchema"]
>;
export type ToolOutput<N extends ToolName> = z.infer<
  (typeof tools)[N]["outputSchema"]
>;

type Handler<N extends ToolName> = (
  input: ToolInput<N>,
  ctx: ToolContext,
) => Promise<ToolOutput<N>>;

export const handlers: { [N in ToolName]: Handler<N> } = {
  readFile: readFileHandler,
  writeFile: writeFileHandler,
  editFile: editFileHandler,
  listDirectory: listDirectoryHandler,
  grep: grepHandler,
  glob: globHandler,
  runShell: runShellHandler,
};
